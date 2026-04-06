import fs from "fs";
import path from "path";
import { execSync } from "node:child_process";
import { generateStableId } from "./generateStableId.js";

export interface Party {
  id: string;
  title: string;
  date: string;
  venue: string;
  url?: string;
  artists?: string[];
  startTime?: string;
  sourceFile?: string;
  lastModified?: string;
}

const dataDir = path.resolve("./data");

function isRAUrl(url?: string): boolean {
  return url ? url.includes("ra.co/") : false;
}

/**
 * Strip "with ...", "w/ ...", "feat. ..." suffixes and normalize for comparison.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+(with|w\/|feat\.?)\s+.*/i, "")
    .replace(/[^a-z0-9äöüß]/g, "")
    .trim();
}

/**
 * Merge artist lists from two events, preserving unique entries.
 */
function mergeArtists(a: string[], b: string[]): string[] {
  const seen = new Set(a.map((s) => s.toLowerCase()));
  const result = [...a];
  for (const artist of b) {
    if (!seen.has(artist.toLowerCase())) {
      seen.add(artist.toLowerCase());
      result.push(artist);
    }
  }
  return result;
}

function getGitLastModified(filePath: string): Date | null {
  try {
    const result = execSync(`git log -1 --format=%aI -- "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    return result ? new Date(result) : null;
  } catch {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch {
      return null;
    }
  }
}

export async function getAllParties(): Promise<Party[]> {
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => f !== "manifest.json" && !f.startsWith("."));

  const filesWithGitDates = files
    .map((file) => {
      const filePath = path.join(dataDir, file);
      const gitDate = getGitLastModified(filePath);
      return {
        name: file,
        path: filePath,
        lastModified: gitDate || new Date(0), // Use epoch if no date available
      };
    })
    .sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());

  console.log("Processing files by Git commit order:");
  filesWithGitDates.forEach((f) => {
    console.log(`  ${f.name} - last modified: ${f.lastModified.toISOString()}`);
  });

  const partyMap = new Map<string, Party>();

  for (const fileInfo of filesWithGitDates) {
    const content = fs.readFileSync(fileInfo.path, "utf-8");
    let json: Party[];

    try {
      json = JSON.parse(content);
    } catch (err) {
      console.warn(`Invalid JSON in ${fileInfo.name}`);
      continue;
    }

    if (!Array.isArray(json)) {
      console.warn(`${fileInfo.name} does not contain an array of events`);
      continue;
    }

    for (const party of json) {
      const id = party.id || generateStableId(party);
      const newParty = {
        ...party,
        id,
        sourceFile: fileInfo.name,
        lastModified: fileInfo.lastModified.toISOString(),
      };

      const existingParty = partyMap.get(id);

      if (!existingParty) {
        partyMap.set(id, newParty);
      } else {
        const existingIsRA = isRAUrl(existingParty.url);
        const newIsRA = isRAUrl(newParty.url);

        if (existingIsRA && !newIsRA) {
          console.log(
            `Replacing RA event ${id} with non-RA version from ${fileInfo.name}`,
          );
          partyMap.set(id, newParty);
        } else if (!existingIsRA && newIsRA) {
          console.log(
            `Keeping non-RA event ${id}, ignoring RA version from ${fileInfo.name}`,
          );
        } else {
          console.log(
            `Updating event ${id} from ${existingParty.sourceFile} with newer version from ${fileInfo.name}`,
          );
          partyMap.set(id, newParty);
        }
      }
    }
  }

  // Secondary dedup: detect same event at same venue+date with different titles
  // (e.g. RA.co "HOOVE with Alex Neri" vs venue site "Hoove")
  const venueeDateGroups = new Map<string, Party[]>();
  for (const party of partyMap.values()) {
    const key = `${party.date}|${party.venue}`;
    if (!venueeDateGroups.has(key)) {
      venueeDateGroups.set(key, []);
    }
    venueeDateGroups.get(key)!.push(party);
  }

  for (const [key, parties] of venueeDateGroups) {
    if (parties.length < 2) continue;

    const raEvents = parties.filter((p) => isRAUrl(p.url));
    const nonRAEvents = parties.filter((p) => p.url && !isRAUrl(p.url));

    if (raEvents.length === 0 || nonRAEvents.length === 0) continue;

    for (const raEvent of raEvents) {
      const raNorm = normalizeTitle(raEvent.title);

      for (const nonRAEvent of nonRAEvents) {
        const nonRANorm = normalizeTitle(nonRAEvent.title);

        // Match if one title contains the other, or they're equal after normalization
        const isMatch =
          raNorm === nonRANorm ||
          raNorm.startsWith(nonRANorm) ||
          nonRANorm.startsWith(raNorm);

        if (isMatch) {
          console.log(
            `Secondary dedup: removing RA event "${raEvent.title}" [${raEvent.id}] in favor of "${nonRAEvent.title}" [${nonRAEvent.id}]`,
          );
          // Merge artists from RA into the non-RA event
          if (raEvent.artists?.length) {
            nonRAEvent.artists = mergeArtists(
              nonRAEvent.artists || [],
              raEvent.artists,
            );
          }
          partyMap.delete(raEvent.id);
          break;
        }
      }
    }
  }

  return Array.from(partyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

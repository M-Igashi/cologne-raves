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

  return Array.from(partyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

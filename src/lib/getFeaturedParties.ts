import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface Party {
  id?: string;
  venue: string;
  date: string;
  title: string;
  artists?: string[];
  startTime: string;
  url?: string;
}

function generateStableId(party: Party): string {
  const input = `${party.venue || ''}-${party.date || ''}-${party.title || ''}`;
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return hash.slice(0, 8);
}

function getBerlinNow(): Date {
  const now = new Date();
  const tz = "Europe/Berlin";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(now).reduce((acc: any, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+01:00`);
}

function getFeaturedDateRange(): { start: Date; end: Date } {
  const now = getBerlinNow();
  const day = now.getDay();

  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const monday13 = new Date(monday);
  monday13.setHours(13, 0, 0, 0);

  if (now >= monday13) {
    return { start: monday, end: sunday };
  } else {
    const lastFriday = new Date(monday);
    lastFriday.setDate(monday.getDate() - 3);
    lastFriday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);

    return { start: lastFriday, end: lastSunday };
  }
}

export async function getFeaturedParties(): Promise<Party[]> {
  const dataDir = path.resolve("./data");
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json")).sort();
  const allParties: Party[] = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    try {
      const events: Party[] = JSON.parse(content);
      events.forEach(event => {
        if (!event.id || event.id.trim() === "") {
          event.id = generateStableId(event);
        }
      });
      allParties.push(...events);
    } catch (err) {
      console.warn(`Warning: Skipping invalid JSON file ${file}`);
    }
  }

  const { start, end } = getFeaturedDateRange();

  return allParties
    .filter(p => {
      const date = new Date(p.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

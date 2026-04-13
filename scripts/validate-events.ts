/**
 * Validates all event data files:
 * 1. All IDs match generateStableId(title, date, venue)
 * 2. No duplicate events across files (by title+date+venue)
 * 3. Required fields are present
 *
 * Run: npx tsx scripts/validate-events.ts
 * Use as pre-commit or CI check.
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { generateStableId } from "../src/lib/generateStableId";

const dataDir = join(import.meta.dirname, "..", "data");
const files = readdirSync(dataDir).filter(
  (f) => f.endsWith(".json") && f !== "event.schema.json"
);

let errors: string[] = [];
let warnings: string[] = [];
const seen = new Map<string, { file: string; id: string }>();
const fuzzyByDateVenue = new Map<string, { file: string; title: string }[]>();

for (const file of files.sort()) {
  const filePath = join(dataDir, file);
  const data = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(data)) {
    errors.push(`${file}: not an array`);
    continue;
  }

  for (let i = 0; i < data.length; i++) {
    const e = data[i];
    const prefix = `${file}[${i}]`;

    // Required fields
    if (!e.title) errors.push(`${prefix}: missing title`);
    if (!e.date) errors.push(`${prefix}: missing date`);
    if (!e.venue) errors.push(`${prefix}: missing venue`);
    if (!e.startTime) errors.push(`${prefix}: missing startTime`);

    // ID validation
    if (e.title && e.date) {
      const correctId = generateStableId({
        title: e.title,
        date: e.date,
        venue: e.venue,
      });
      if (e.id && e.id !== correctId) {
        errors.push(
          `${prefix}: ID mismatch: "${e.id}" should be "${correctId}" (${e.title})`
        );
      }
    }

    // Cross-file duplicate check (exact title match)
    const key = `${e.title}|${e.date}|${e.venue || ""}`;
    if (seen.has(key)) {
      const prev = seen.get(key)!;
      errors.push(
        `${prefix}: duplicate of ${prev.file} (${e.title} @ ${e.date} @ ${e.venue})`
      );
    } else {
      seen.set(key, { file, id: e.id });
    }

    // Fuzzy duplicate check (same date+venue, one title contains the other)
    const fuzzyKey = `${e.date}|${(e.venue || "").toLowerCase().trim()}`;
    const titleLower = (e.title || "").toLowerCase().trim();
    if (!fuzzyByDateVenue.has(fuzzyKey)) {
      fuzzyByDateVenue.set(fuzzyKey, []);
    }
    for (const prev of fuzzyByDateVenue.get(fuzzyKey)!) {
      const prevTitle = prev.title.toLowerCase().trim();
      if (
        titleLower !== prevTitle &&
        (titleLower.includes(prevTitle) || prevTitle.includes(titleLower))
      ) {
        warnings.push(
          `${prefix}: possible duplicate of ${prev.file} — "${e.title}" vs "${prev.title}" (${e.date} @ ${e.venue})`
        );
      }
    }
    fuzzyByDateVenue.get(fuzzyKey)!.push({ file, title: e.title });
  }
}

if (warnings.length > 0) {
  console.warn(`\n⚠️  ${warnings.length} warning(s) (possible fuzzy duplicates):\n`);
  warnings.forEach((w) => console.warn(`  - ${w}`));
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} validation error(s):\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`\n✅ All ${seen.size} events across ${files.length} files are valid.`);
}

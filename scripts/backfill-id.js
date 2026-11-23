import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateStableId } from "../src/lib/generateStableId.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

function processFile(filePath) {
  const filename = path.basename(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (!Array.isArray(data)) {
    console.log(`Skipped ${filename} (not an array)`);
    return;
  }

  let changed = false;
  for (const party of data) {
    if (!party.id) {
      party.id = generateStableId(party);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${filename}`);
  } else {
    console.log(`Skipped ${filename} (no changes)`);
  }
}

for (const f of fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"))) {
  processFile(path.join(dataDir, f));
}

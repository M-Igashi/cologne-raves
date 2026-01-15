import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");

function generateId(party) {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify([party.title, party.date, party.venue]))
    .digest("hex");
  return hash.slice(0, 8);
}

function processFile(filePath) {
  const filename = path.basename(filePath);

  if (filename === "manifest.json") {
    console.log(`Skipped ${filename} (configuration file)`);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.log(`Skipped ${filename} (not an array)`);
    return;
  }

  let changed = false;
  const updated = data.map(function (party) {
    if (!party.id) {
      party.id = generateId(party);
      changed = true;
    }
    return party;
  });

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log(`Updated ${filename}`);
  } else {
    console.log(`Skipped ${filename} (no changes)`);
  }
}

const jsonFiles = fs.readdirSync(dataDir).filter(function (f) {
  return f.endsWith(".json");
});

jsonFiles.forEach(function (f) {
  processFile(path.join(dataDir, f));
});

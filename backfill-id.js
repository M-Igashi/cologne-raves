// backfill-id.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, 'data');

function generateId(party) {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify([party.title, party.date, party.venue]))
    .digest('hex');
  return hash.slice(0, 8);
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  let changed = false;

  const updated = data.map((party) => {
    if (!party.id) {
      party.id = generateId(party);
      changed = true;
    }
    return party;
  });

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log(`✅ Updated ${path.basename(filePath)}`);
  } else {
    console.log(`⏩ Skipped ${path.basename(filePath)} (no changes)`);
  }
}

fs.readdirSync(dataDir)
  .filter((f) => f.endsWith('.json'))
  .forEach((f) => processFile(path.join(dataDir, f)));
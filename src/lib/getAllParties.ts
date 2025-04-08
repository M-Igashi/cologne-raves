import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Party {
  id: string;
  title: string;
  date: string;
  venue: string;
  url?: string;
  artists?: string[];
  startTime?: string;
  sourceFile?: string;
}

const dataDir = path.resolve('./data');

function generateStableId(party: Omit<Party, 'id'>): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify([party.title, party.date, party.venue]))
    .digest('hex');
  return hash.slice(0, 8);
}

export async function getAllParties(): Promise<Party[]> {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  const partyMap = new Map<string, Party>();

  for (const file of files) {
    const fullPath = path.join(dataDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    let json: Party[];

    try {
      json = JSON.parse(content);
    } catch (err) {
      console.warn(`Invalid JSON in ${file}`);
      continue;
    }

    for (const party of json) {
      const id = party.id || generateStableId(party);
      partyMap.set(id, { ...party, id, sourceFile: file });
    }
  }

  return Array.from(partyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
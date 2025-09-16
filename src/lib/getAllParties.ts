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
  
  // Get file stats and sort by modification time (oldest first)
  // This ensures newer files override older ones
  const filesWithStats = files.map(file => ({
    name: file,
    path: path.join(dataDir, file),
    mtime: fs.statSync(path.join(dataDir, file)).mtime
  })).sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
  
  const partyMap = new Map<string, Party>();

  for (const fileInfo of filesWithStats) {
    const content = fs.readFileSync(fileInfo.path, 'utf-8');
    let json: Party[];

    try {
      json = JSON.parse(content);
    } catch (err) {
      console.warn(`Invalid JSON in ${fileInfo.name}`);
      continue;
    }

    for (const party of json) {
      const id = party.id || generateStableId(party);
      // Store with source file and timestamp for debugging
      partyMap.set(id, { 
        ...party, 
        id, 
        sourceFile: fileInfo.name
      });
    }
  }

  return Array.from(partyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
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

function isRAUrl(url?: string): boolean {
  return url ? url.includes('ra.co/') : false;
}

export async function getAllParties(): Promise<Party[]> {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  
  const partyMap = new Map<string, Party>();

  // First pass: Load all events into the map
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    let json: Party[];

    try {
      json = JSON.parse(content);
    } catch (err) {
      console.warn(`Invalid JSON in ${file}`);
      continue;
    }

    for (const party of json) {
      const id = party.id || generateStableId(party);
      const newParty = { 
        ...party, 
        id, 
        sourceFile: file
      };

      // Check if this ID already exists
      const existingParty = partyMap.get(id);
      
      if (!existingParty) {
        // No existing party, add it
        partyMap.set(id, newParty);
      } else {
        // Deduplication logic: Non-RA.co events take precedence over RA.co events
        const existingIsRA = isRAUrl(existingParty.url);
        const newIsRA = isRAUrl(newParty.url);
        
        if (existingIsRA && !newIsRA) {
          // Existing is RA, new is not RA - replace with non-RA version
          console.log(`Replacing RA.co event ${id} with non-RA version from ${file}`);
          partyMap.set(id, newParty);
        } else if (!existingIsRA && newIsRA) {
          // Existing is non-RA, new is RA - keep the non-RA version
          console.log(`Keeping non-RA event ${id}, ignoring RA version from ${file}`);
        } else {
          // Both are RA or both are non-RA - use alphabetical order of filenames as tiebreaker
          // Files with dates in their names (like 2025-09-cologne-16-7482f3.json) will naturally
          // override generic files (like nx.json, nx9.json)
          if (file > existingParty.sourceFile!) {
            console.log(`Updating event ${id} from ${existingParty.sourceFile} with version from ${file}`);
            partyMap.set(id, newParty);
          }
        }
      }
    }
  }

  return Array.from(partyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

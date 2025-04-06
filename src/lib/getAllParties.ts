import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Party {
  id?: string;
  venue: string;
  date: string;
  title: string;
  artists?: string[];
  startTime: string;
  url?: string;
}

/**
 * Generate a stable ID based on venue, date, and title
 */
function generateStableId(party: Party): string {
  const input = `${party.venue || ''}-${party.date || ''}-${party.title || ''}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return hash.slice(0, 8);
}

/**
 * Load and return all party events from /data
 * Automatically assigns stable ID if missing
 */
export async function getAllParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  let allParties: Party[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const events: Party[] = JSON.parse(content);

    events.forEach(event => {
      if (!event.id || event.id.trim() === "") {
        event.id = generateStableId(event);
      }
    });

    allParties.push(...events);
  }

  return allParties.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

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

function generateStableId(party: Party): string {
  const input = `${party.venue || ''}-${party.date || ''}-${party.title || ''}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return hash.slice(0, 8);
}

export async function getAllParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  const partyMap: Map<string, Party> = new Map();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const events: Party[] = JSON.parse(content);

    for (const event of events) {
      if (!event.id) {
        event.id = generateStableId(event);
      }
      // ID重複時は新しいイベント（後のファイル）で上書き
      partyMap.set(event.id, event);
    }
  }

  return Array.from(partyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

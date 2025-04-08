import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import slugify from 'slugify';
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

function generateStableId(party: Omit<Party, 'id'>): string {
  if (party.id) return party.id;
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify([party.title, party.date, party.venue]))
    .digest('hex');
  return hash.slice(0, 8);
}

export async function getAllParties(): Promise<Party[]> {
  const dir = path.resolve('./data');
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));

  const all: Party[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const entries: Omit<Party, 'id'>[] = JSON.parse(content);

    for (const entry of entries) {
      const id = generateStableId(entry);
      all.push({ ...entry, id, sourceFile: file });
    }
  }

  // 重複排除（最後に読み込まれたものを優先）
  const uniqueMap = new Map<string, Party>();
  for (const party of all) {
    uniqueMap.set(party.id, party);
  }

  const deduplicated = Array.from(uniqueMap.values());

  // 日付順にソート
  return deduplicated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
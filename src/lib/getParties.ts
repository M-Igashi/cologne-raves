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
 * venue + date + title をもとにハッシュ化した一意IDを生成
 */
function generateStableId(party: Party): string {
  const input = `${party.venue || ''}-${party.date || ''}-${party.title || ''}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return hash.slice(0, 8); // 最初の8文字だけ使用（短くて比較しやすい）
}

function isThisWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();

  const friday = new Date(today);
  friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  return date >= friday && date <= sunday;
}

export async function getAllParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  let allParties: Party[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const events: Party[] = JSON.parse(content);

    events.forEach(event => {
      if (!event.id) {
        event.id = generateStableId(event);
      }
    });

    allParties.push(...events);
  }

  return allParties.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function getThisWeekendParties(): Promise<Party[]> {
  const all = await getAllParties();
  return all.filter(p => isThisWeekend(p.date));
}

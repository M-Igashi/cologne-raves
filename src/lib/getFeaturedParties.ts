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

// 安定したID生成
function generateStableId(party: Party): string {
  const input = `${party.venue}-${party.date}-${party.title}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return hash.slice(0, 8);
}

// Europe/Berlin 現在時刻を取得
function getBerlinNow(): Date {
  const now = new Date();
  const berlinNow = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
    .formatToParts(now)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {} as any);

  return new Date(
    `${berlinNow.year}-${berlinNow.month}-${berlinNow.day}T${berlinNow.hour}:${berlinNow.minute}:${berlinNow.second}+01:00`
  );
}

// 月曜13:00以降 → 今週、それ以前 → 前週末（金〜日）
function getFeaturedDateRange(): { start: Date; end: Date } {
  const now = getBerlinNow();
  const day = now.getDay();

  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const monday13 = new Date(monday);
  monday13.setHours(13, 0, 0, 0);

  if (now >= monday13) {
    return { start: monday, end: sunday };
  } else {
    const lastFriday = new Date(monday);
    lastFriday.setDate(monday.getDate() - 3);
    lastFriday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);

    return { start: lastFriday, end: lastSunday };
  }
}

export async function getFeaturedParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  const allParties: Party[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    let events: Party[] = [];

    try {
      events = JSON.parse(content);
    } catch {
      continue;
    }

    events.forEach(event => {
      if (!event.id || event.id.trim() === '') {
        event.id = generateStableId(event);
      }
    });

    allParties.push(...events);
  }

  const { start, end } = getFeaturedDateRange();

  return allParties
    .filter(p => {
      if (!p.date) return false;
      const date = new Date(p.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

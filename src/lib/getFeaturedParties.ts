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

// 安定したID生成関数
function generateStableId(party: Party): string {
  const input = `${party.venue || ''}-${party.date || ''}-${party.title || ''}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return hash.slice(0, 8);
}

// 現在時刻を Europe/Berlin タイムゾーンで取得
function getBerlinNow(): Date {
  const now = new Date();
  const berlinParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now).reduce((acc: any, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(`${berlinParts.year}-${berlinParts.month}-${berlinParts.day}T${berlinParts.hour}:${berlinParts.minute}:${berlinParts.second}+01:00`);
}

// 今週 (月〜日) の範囲を返す
function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay(); // 0:Sun - 6:Sat
  const diffToMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function getFeaturedParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  const allParties: Party[] = [];

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

  const now = getBerlinNow();
  const { start, end } = getWeekRange(now);

  const featured = allParties.filter(p => {
    const date = new Date(p.date);
    return date >= start && date <= end;
  });

  return featured.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

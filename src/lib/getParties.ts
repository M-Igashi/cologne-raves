import fs from 'fs';
import path from 'path';

export interface Party {
  venue: string;
  date: string;
  title: string;
  artists: string[];
  startTime: string;
  url: string;
}

function isThisWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  return date >= friday && date <= sunday;
}

export async function getAllParties(): Promise<Party[]> {
  const dataDir = path.resolve('./data');
  const files = fs.readdirSync(dataDir);
  const allParties: Party[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const parties: Party[] = JSON.parse(content);
    allParties.push(...parties);
  }

  return allParties.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getThisWeekendParties(): Promise<Party[]> {
  const all = await getAllParties();
  return all.filter(p => isThisWeekend(p.date));
}

import { getBerlinNow } from './getBerlinNow';
import { generateStableId } from './generateStableId';
import type { Party } from '../types';
import allParties from '../../data/2025-04-cologne-04-06.json';

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getFeaturedParties(): Party[] {
  const now = getBerlinNow();
  const { start, end } = getWeekRange(now);

  const featured = allParties.filter((party) => {
    const partyDate = new Date(party.date);
    return partyDate >= start && partyDate <= end;
  });

  // 安定した ID を生成
  return featured.map((party) => ({
    ...party,
    id: party.id || generateStableId(party),
  }));
}

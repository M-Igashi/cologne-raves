import { getAllParties } from './getAllParties';

/**
 * Europe/Berlin タイムゾーンでの現在時刻を返す
 */
function getBerlinNow(): Date {
  const berlinOffsetMs = 60 * 60 * 1000; // CET は UTC+1（夏時間未対応）
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + berlinOffsetMs);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function getFeaturedDateRange(now: Date): { start: Date; end: Date } {
  const monday = getMonday(now);
  const afterMonday13 = now.getDay() === 1 && now.getHours() >= 13;

  const rangeStart = afterMonday13 ? monday : new Date(monday.setDate(monday.getDate() - 7));
  const rangeEnd = getSunday(rangeStart);
  return { start: rangeStart, end: rangeEnd };
}

export async function getFeaturedParties() {
  const parties = await getAllParties();
  const now = getBerlinNow();
  const { start, end } = getFeaturedDateRange(now);

  return parties
    .filter((party) => {
      const date = new Date(party.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
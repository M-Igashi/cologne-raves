import { getAllParties } from './getAllParties';
import { generateStableId } from './generateStableId';
import { startOfWeek, endOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

function getBerlinNow() {
  return toZonedTime(new Date(), 'Europe/Berlin');
}

function getFeaturedDateRange() {
  const now = getBerlinNow();
  const isMondayAfter1PM = now.getDay() === 1 && now.getHours() >= 13;
  const isAfterMonday1PM = now.getDay() > 1 || isMondayAfter1PM;

  if (isAfterMonday1PM) {
    // 月曜13:00以降 → 今週の月曜〜日曜
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { start, end };
  } else {
    // 月曜13:00前 → 先週の金〜日
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);

    const startOfLastWeek = startOfWeek(lastWeek, { weekStartsOn: 1 });

    const friday = new Date(startOfLastWeek);
    friday.setDate(friday.getDate() + 4);

    const sunday = new Date(startOfLastWeek);
    sunday.setDate(sunday.getDate() + 6);

    return { start: friday, end: sunday };
  }
}

export async function getFeaturedParties() {
  const allParties = await getAllParties();
  const { start, end } = getFeaturedDateRange();

  const featuredParties = allParties
    .filter((party) => {
      const date = new Date(party.date);
      return date >= start && date <= end;
    })
    .map((party) => ({
      ...party,
      id: party.id || generateStableId(party),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return featuredParties;
}
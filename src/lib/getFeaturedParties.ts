import { generateStableId } from './generateStableId';
import { getAllParties } from './getAllParties';
import { eachDayOfInterval, endOfWeek, startOfWeek, subWeeks, startOfDay } from 'date-fns-tz';
import { utcToZonedTime } from 'date-fns-tz';

const berlinTimeZone = 'Europe/Berlin';

function getBerlinNow() {
  return utcToZonedTime(new Date(), berlinTimeZone);
}

function getFeaturedDateRange() {
  const now = getBerlinNow();

  const mondayThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const isAfterMonday1PM =
    now.getDay() === 1 &&
    (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() >= 0));

  if (!isAfterMonday1PM) {
    // まだ月曜13時前なので先週を表示
    const lastMonday = subWeeks(mondayThisWeek, 1);
    const lastSunday = endOfWeek(lastMonday, { weekStartsOn: 1 });
    return {
      start: startOfDay(lastMonday),
      end: startOfDay(lastSunday),
    };
  }

  // 月曜13時以降なので今週を表示
  const sundayThisWeek = endOfWeek(mondayThisWeek, { weekStartsOn: 1 });
  return {
    start: startOfDay(mondayThisWeek),
    end: startOfDay(sundayThisWeek),
  };
}

export async function getFeaturedParties() {
  const allParties = await getAllParties();
  const { start, end } = getFeaturedDateRange();

  const days = eachDayOfInterval({ start, end });

  const featured = allParties
    .filter((party) => {
      const partyDate = utcToZonedTime(new Date(party.date), berlinTimeZone);
      return days.some(
        (day) =>
          partyDate.getFullYear() === day.getFullYear() &&
          partyDate.getMonth() === day.getMonth() &&
          partyDate.getDate() === day.getDate()
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((party) => ({
      ...party,
      id: party.id || generateStableId(party),
    }));

  return featured;
}
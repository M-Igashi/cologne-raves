import { getAllParties } from './getAllParties';

function getBerlinNow(): Date {
  const now = new Date();
  const berlinOffset = -new Date().getTimezoneOffset() + 60; // CET = UTC+1, DST = UTC+2
  return new Date(now.getTime() + berlinOffset * 60 * 1000);
}

function getFeaturedDateRange(): { start: Date; end: Date } {
  const now = getBerlinNow();
  const day = now.getDay(); // Sun = 0, Mon = 1, ..., Sat = 6
  const hour = now.getHours();

  const isAfterMonday13 = day === 1 && hour >= 13 || day > 1;

  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday of this week
  currentMonday.setHours(0, 0, 0, 0);

  const nextSunday = new Date(currentMonday);
  nextSunday.setDate(currentMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);

  const previousMonday = new Date(currentMonday);
  previousMonday.setDate(currentMonday.getDate() - 7);

  const previousSunday = new Date(currentMonday);
  previousSunday.setDate(currentMonday.getDate() - 1);
  previousSunday.setHours(23, 59, 59, 999);

  return isAfterMonday13
    ? { start: currentMonday, end: nextSunday }
    : { start: previousMonday, end: previousSunday };
}

export async function getFeaturedParties() {
  const allParties = await getAllParties();
  const { start, end } = getFeaturedDateRange();

  return allParties
    .filter((party) => {
      const date = new Date(party.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
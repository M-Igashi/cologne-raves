import { startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getAllParties, type Party } from "./getAllParties.js";

const BERLIN_TIMEZONE = "Europe/Berlin";
const MONDAY = 1;
const REFRESH_HOUR = 13;

function getBerlinNow(): Date {
  return toZonedTime(new Date(), BERLIN_TIMEZONE);
}

function isAfterWeeklyRefresh(now: Date): boolean {
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const isMondayAfterRefresh = dayOfWeek === MONDAY && hour >= REFRESH_HOUR;
  return dayOfWeek > MONDAY || isMondayAfterRefresh;
}

function getCurrentWeekRange(now: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(now, { weekStartsOn: MONDAY }),
    end: endOfWeek(now, { weekStartsOn: MONDAY }),
  };
}

function getLastWeekendRange(now: Date): { start: Date; end: Date } {
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  const weekStart = startOfWeek(lastWeek, { weekStartsOn: MONDAY });

  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);

  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);

  return { start: friday, end: sunday };
}

function getFeaturedDateRange(): { start: Date; end: Date } {
  const now = getBerlinNow();
  if (isAfterWeeklyRefresh(now)) {
    return getCurrentWeekRange(now);
  }
  return getLastWeekendRange(now);
}

function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export async function getFeaturedParties(): Promise<Party[]> {
  const allParties = await getAllParties();
  const { start, end } = getFeaturedDateRange();

  return allParties.filter(function (party) {
    return isWithinRange(new Date(party.date), start, end);
  });
}

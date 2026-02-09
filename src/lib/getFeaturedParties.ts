import { startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getAllParties, type Party } from "./getAllParties.js";

const BERLIN_TIMEZONE = "Europe/Berlin";
const MONDAY = 1;

function getBerlinNow(): Date {
  return toZonedTime(new Date(), BERLIN_TIMEZONE);
}

function getFeaturedDateRange(): { start: Date; end: Date } {
  const now = getBerlinNow();
  return {
    start: startOfWeek(now, { weekStartsOn: MONDAY }),
    end: endOfWeek(now, { weekStartsOn: MONDAY }),
  };
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

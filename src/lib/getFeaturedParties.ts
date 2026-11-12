import { startOfWeek, endOfWeek, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getAllParties, type Party } from "./getAllParties.js";

const BERLIN_TIMEZONE = "Europe/Berlin";
const DATE_FORMAT = "yyyy-MM-dd";

// Current Monday-to-Sunday week in Berlin as YYYY-MM-DD strings, directly
// comparable with event dates regardless of the build machine's timezone.
export function getBerlinWeekRange(): { start: string; end: string } {
  const now = toZonedTime(new Date(), BERLIN_TIMEZONE);
  const options = { weekStartsOn: 1 } as const;
  return {
    start: format(startOfWeek(now, options), DATE_FORMAT),
    end: format(endOfWeek(now, options), DATE_FORMAT),
  };
}

export async function getFeaturedParties(): Promise<Party[]> {
  const allParties = await getAllParties();
  const { start, end } = getBerlinWeekRange();

  return allParties.filter((party) => party.date >= start && party.date <= end);
}

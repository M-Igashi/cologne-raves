import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Party } from "../lib/getAllParties";

export const SITE_URL = "https://cologne.ravers.workers.dev";
export const SITE_NAME = "Cologne Raves";
export const OG_IMAGE = `${SITE_URL}/og-cologne-raves.png`;

const TIMEZONE = "Europe/Berlin";
const ISO_FORMAT = "yyyy-MM-dd'T'HH:mm:ssxxx";

// Event dates are plain YYYY-MM-DD strings, so format them in UTC to avoid day shifts.
export function formatDate(date: string, options: Intl.DateTimeFormatOptions, locale = "en-GB"): string {
  return new Date(date).toLocaleDateString(locale, { timeZone: "UTC", ...options });
}

// Lowercase and strip diacritics so "gewolbe" finds "Gewölbe". Mirrored in the
// filter script on the parties page.
export function searchKey(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Start in Berlin local time (correct CET/CEST offset); end defaults to 3 hours
// later, which may fall on the next day.
export function eventTimes(party: Pick<Party, "date" | "startTime">) {
  const time = /^\d{2}:\d{2}$/.test(party.startTime ?? "") ? party.startTime : "23:00";
  const start = fromZonedTime(`${party.date}T${time}:00`, TIMEZONE);
  return {
    start: formatInTimeZone(start, TIMEZONE, ISO_FORMAT),
    end: formatInTimeZone(new Date(start.getTime() + 3 * 60 * 60 * 1000), TIMEZONE, ISO_FORMAT),
  };
}

export function eventJsonLd(party: Party) {
  const { start, end } = eventTimes(party);
  const artists = party.artists ?? [];
  return {
    "@type": "MusicEvent",
    name: party.title,
    description: `${party.title}${party.venue ? ` at ${party.venue}` : ""}, Cologne (Köln)${artists.length ? `. Lineup: ${artists.join(", ")}` : ""}`,
    startDate: start,
    endDate: end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: party.venue || "Cologne",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Köln",
        addressRegion: "NW",
        addressCountry: "DE",
      },
    },
    image: OG_IMAGE,
    ...(artists.length && {
      performer: artists.map((name) => ({ "@type": "Person", name })),
    }),
    ...(party.url && { offers: { "@type": "Offer", url: party.url } }),
    url: party.url || `${SITE_URL}/parties/`,
  };
}

// Venues with the most listed events first. Spelling variants ("Helios37" vs
// "Helios 37") count as one venue; "TBA" placeholders are skipped.
export function topVenues(parties: Party[], limit = 12): string[] {
  const venues = new Map<string, { name: string; count: number }>();
  for (const { venue } of parties) {
    const key = searchKey(venue ?? "").replace(/[^a-z0-9]/g, "");
    if (!key || key === "tba") continue;
    const entry = venues.get(key) ?? { name: venue, count: 0 };
    entry.count++;
    venues.set(key, entry);
  }
  return [...venues.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ name }) => name);
}

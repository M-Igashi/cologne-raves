// Decides whether a submitted event file may be merged without review.
// Usage: node scripts/auto-merge-check.js data/<file>.json
// Exits 0 when eligible. Otherwise exits 1 and prints one reason per line.
// Reasons never echo submitted text: they end up in the pull request body.

import fs from "fs";
import path from "path";

const MAX_EVENTS = 4;
const MAX_DAYS_AHEAD = 365;

const target = path.resolve(process.argv[2] ?? "");
const dataDir = path.dirname(target);

const normalize = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const readEvents = (file) => {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(data) ? data : [];
};
const berlinDate = (date) => date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const isRealDate = (date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
const sameParty = (a, b) => {
  const [titleA, titleB] = [normalize(a.title), normalize(b.title)];
  return (
    a.date === b.date &&
    normalize(a.venue) === normalize(b.venue) &&
    (titleA.includes(titleB) || titleB.includes(titleA))
  );
};

const existing = fs
  .readdirSync(dataDir)
  .filter((file) => file.endsWith(".json") && path.join(dataDir, file) !== target)
  .flatMap((file) => readEvents(path.join(dataDir, file)));

// Links belong in the url field; in a title, venue, or lineup they are a spam signal.
const hasLink = (value) => /https?:|www\.|\.(com|de|net|org|io|ru|xyz)\b/i.test(String(value ?? ""));

const today = berlinDate(new Date());
const latest = berlinDate(new Date(Date.now() + MAX_DAYS_AHEAD * 86_400_000));

const events = readEvents(target);
const reasons = [];

if (events.length === 0 || events.length > MAX_EVENTS) {
  reasons.push(`The file must hold 1 to ${MAX_EVENTS} events.`);
}

events.forEach((event, index) => {
  const label = `Event ${index + 1}`;
  if (event.id) {
    reasons.push(`${label} carries an ID, so it updates an existing event.`);
  }
  if (!isRealDate(String(event.date)) || event.date < today || event.date > latest) {
    reasons.push(`${label} is not dated within the next ${MAX_DAYS_AHEAD} days.`);
  }
  if (event.url && !String(event.url).startsWith("https://")) {
    reasons.push(`${label} has a link that is not https.`);
  }
  if ([event.title, event.venue, ...(Array.isArray(event.artists) ? event.artists : [])].some(hasLink)) {
    reasons.push(`${label} has a link in its title, venue, or lineup.`);
  }
  if (existing.some((other) => sameParty(event, other))) {
    reasons.push(`${label} looks like a duplicate of an existing event.`);
  }
  if (events.some((other, otherIndex) => otherIndex < index && sameParty(event, other))) {
    reasons.push(`${label} repeats another event in the same submission.`);
  }
});

if (reasons.length > 0) {
  console.log(reasons.join("\n"));
  process.exit(1);
}

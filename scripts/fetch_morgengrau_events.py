#!/usr/bin/env python3
"""Import upcoming Cologne events from morgengrau.net into data/.

morgengrau.net is a Nuxt app backed by an unauthenticated REST API:
/api/dates/ lists every upcoming event, /api/events/<id>/ adds the ticket link.

Usage:
    python3 scripts/fetch_morgengrau_events.py            # write data/<today>-morgengrau-events.json
    python3 scripts/fetch_morgengrau_events.py --dry-run  # report only
"""

import argparse
import collections
import datetime
import glob
import json
import os
import re
import sys
import time
import urllib.request

sys.dont_write_bytecode = True
from fetch_onlytechno_events import clean_url, norm, same_title, same_venue

BASE = "https://www.morgengrau.net"
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}

# Source venue name -> name used in data/. Names that already match an existing
# venue (ignoring case, umlauts, and punctuation) need no entry here.
VENUE_ALIASES = {
    "t.b.a.": "TBA",
    "Philharmonie": "Kölner Philharmonie",
    "674fm (Konzertraum)": "674fm",
    "Park-Cafe im Rheinpark": "Parkcafe",
}
# Events dated further ahead than this are treated as placeholders.
MAX_DAYS_AHEAD = 400

LINEUP_SPLIT = re.compile(r"\s+/?w/\.?\s*|\s+/w\.?\s+|\s+with\s+", re.I)
LINEUP_TAIL = re.compile(
    r"\s*(,|&|\+)?\s*(u\.?\s?v\.?\s?m\.?|and more|many more|more)\s*$|\s+(@|at)\s+[^,]+$", re.I
)
TITLE_VENUE = re.compile(r"\s(?:@|at)\s+(.+)$", re.I)


def get_json(path):
    req = urllib.request.Request(BASE + path, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


def fetch_events():
    events, page = [], 1
    while True:
        data = get_json(f"/api/dates/?page={page}")
        for day in data["results"]:
            events += day["events"]
        if not data.get("next"):
            return events
        page += 1
        time.sleep(1)


def artists_from_title(title):
    parts = LINEUP_SPLIT.split(title, maxsplit=1)
    if len(parts) < 2:
        return []
    lineup = parts[1]
    while LINEUP_TAIL.search(lineup):
        lineup = LINEUP_TAIL.sub("", lineup)
    return [a.strip() for a in lineup.split(",") if a.strip()]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    today = datetime.date.today()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    ap.add_argument("--output", default=os.path.join(root, "data", f"{today}-morgengrau-events.json"))
    args = ap.parse_args()

    if not args.dry_run and os.path.exists(args.output):
        sys.exit(f"{args.output} already exists; pass --output to choose another name")

    existing = []
    for path in glob.glob(os.path.join(root, "data", "*.json")):
        with open(path, encoding="utf-8") as f:
            existing += json.load(f)
    canonical = {}
    for venue, _ in collections.Counter(e["venue"] for e in existing).most_common():
        canonical.setdefault(norm(venue), venue.strip())
    by_date = collections.defaultdict(list)
    for e in existing:
        by_date[e["date"]].append(e)

    last_date = (today + datetime.timedelta(days=MAX_DAYS_AHEAD)).isoformat()
    source = fetch_events()
    new, dups, outside, placeholders = [], [], [], []
    for src in source:
        title = src["title"].strip()
        date = src["date"][:10]
        if src["location"]["is_outside_cologne"]:
            outside.append((date, src["location"]["name"], title))
            continue
        if date < today.isoformat() or date > last_date:
            placeholders.append((date, src["location"]["name"], title))
            continue
        venue = src["location"]["name"].strip()
        venue = VENUE_ALIASES.get(venue, venue)
        venue = canonical.get(norm(venue), venue)
        if venue == "TBA":
            named = TITLE_VENUE.search(title)
            if named and norm(named.group(1)) in canonical:
                venue = canonical[norm(named.group(1))]
        event = {
            "title": title,
            "venue": venue,
            "date": date,
            "startTime": src["date"][11:16],
            "artists": artists_from_title(title),
        }
        matches = [
            e
            for e in by_date.get(date, [])
            if same_venue(e["venue"], venue) or same_title(e["title"], title)
        ]
        if matches:
            dups.append((event, matches))
        else:
            new.append((event, src))

    key = lambda e: (e["date"], e["venue"], e["title"])
    new.sort(key=lambda n: key(n[0]))
    for event, src in new:
        detail = get_json(f"/api/events/{src['id']}/")
        event["url"] = clean_url(detail.get("ticket_url")) or f"{BASE}/party/{src['slug']}/{src['id']}"
        time.sleep(0.3)
    new = [event for event, _ in new]
    known = {norm(v) for v in canonical.values()}

    print(f"{len(source)} events fetched: {len(new)} new, {len(dups)} already in data/, "
          f"{len(outside)} outside Cologne, {len(placeholders)} placeholder dates")
    print("\n== Already in data/ (source -> existing) ==")
    for event, matches in sorted(dups, key=lambda d: key(d[0])):
        found = " ;; ".join(f"{m['venue']}: {m['title']}" for m in matches)
        print(f"{event['date']} {event['startTime']} | {event['venue']} | {event['title'][:70]}  ->  {found[:120]}")
    print("\n== Skipped: outside Cologne ==")
    for row in outside:
        print(" | ".join(row))
    print("\n== Skipped: placeholder date ==")
    for row in placeholders:
        print(" | ".join(row))
    print("\n== New ==")
    for event in new:
        flags = []
        if norm(event["venue"]) not in known:
            flags.append("UNKNOWN VENUE: add to VENUE_ALIASES if it is a variant")
        if event["url"].startswith(BASE):
            flags.append("no ticket link, using morgengrau page")
        if not event["artists"]:
            flags.append("no artists")
        suffix = f"  [{'; '.join(flags)}]" if flags else ""
        print(f"{event['date']} {event['startTime']} | {event['venue']} | {event['title']}{suffix}")
        if event["artists"]:
            print(f"      artists: {event['artists']}")

    if args.dry_run or not new:
        return
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(new, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nWrote {len(new)} events to {os.path.relpath(args.output, root)}")


if __name__ == "__main__":
    main()

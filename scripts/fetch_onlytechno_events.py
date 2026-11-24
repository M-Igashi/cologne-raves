#!/usr/bin/env python3
"""Import upcoming Cologne events from only-techno.com into data/.

only-techno.com is a Softr app. Its event-details block reads the event table
through an unauthenticated internal endpoint, which this script pages through.
The endpoint is undocumented: if it starts failing, re-read the page source of
https://www.only-techno.com/event-details and update PAGE_ID / BLOCK_ID / FIELDS.

Usage:
    python3 scripts/fetch_onlytechno_events.py            # write data/<today>-onlytechno-events.json
    python3 scripts/fetch_onlytechno_events.py --dry-run  # report only
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
import unicodedata
import urllib.request
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

APP_ID = "6cacd671-ba3b-4024-bdbc-f3e385bb009e"
PAGE_ID = "b4178da3-acde-46fb-9f19-5e81a09286eb"
BLOCK_ID = "48fa4016-ae3d-4126-af3e-2d8b378d3f72"
API_URL = (
    f"https://www.only-techno.com/v1/datasource/applications/{APP_ID}"
    f"/pages/{PAGE_ID}/blocks/{BLOCK_ID}/datasources/events/records"
)
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "X-Block-Version": "5.7.0",
    "X-Block-Name": "vibe-coding",
    "Referer": "https://www.only-techno.com/event-details",
}
FIELDS = {
    "title": "ym4xQ",
    "date": "oeLcu",
    "city": "txjIM",
    "venue": "SnQK2",
    "lineup": "OrVdz",
    "ticket": "HbaaK",
    "address": "aYHkN",
    "organizer": "9SHBN",
}

CITY = "Köln"
START_TIME = "23:00"

# Source venue name -> name used in data/. Names that already match an existing
# venue (ignoring case, umlauts, and punctuation) need no entry here.
VENUE_ALIASES = {
    "Essigfabrik / Elektroküche": "Elektroküche",
    "Elektroküche / Essigfabrik (Siegburger Str. 110)": "Elektroküche",
    "Carlswerk": "Carlswerk Victoria",
    "Bollwerk": "Bollwerk Cologne",
}
# Venues sharing one site: an event listed under either counts as the same place.
VENUE_GROUPS = [{"Essigfabrik", "Elektroküche"}]
# Ticket links known to be wrong in the source.
WRONG_URLS = {"https://ticketkings.de/event/m-d-m-a-xxx-proton-xxx-stuttgart/"}

LINEUP_PREFIX = re.compile(
    r"^(mainfloor|second floor|third floor|essigfabrik|elektroküche)\s*:\s*", re.I
)
LINEUP_SKIP = {"tba", "newcomer", "newcomer floor"}
# RA's disambiguation suffix on artist names, as in "Speedo (2)".
RA_NUMBER = re.compile(r"\s*\(\d+\)")


def norm(s):
    s = (s or "").lower()
    for a, b in (("ö", "oe"), ("ü", "ue"), ("ä", "ae"), ("ø", "o")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", s))


def label(v):
    return (v.get("label") if isinstance(v, dict) else v) or ""


def fetch_records():
    items, offset = [], None
    while True:
        body = {
            "options": {"timeZone": "Europe/Berlin", "userLocale": "en-US"},
            "pageContext": None,
            "filterCriteria": {},
            "pagingOption": {"offset": offset, "count": 100},
        }
        req = urllib.request.Request(API_URL, json.dumps(body).encode(), HEADERS)
        with urllib.request.urlopen(req, timeout=60) as res:
            page = json.load(res)
        items += page["items"]
        offset = page.get("offset")
        if not page["items"] or not offset or len(items) >= page.get("total", 0):
            return items
        time.sleep(1)


def split_lineup(s):
    parts = re.split(r"\s*[,|\n]\s*", (s or "").strip())
    parts = [RA_NUMBER.sub("", LINEUP_PREFIX.sub("", p)).strip() for p in parts]
    return [p for p in parts if p and p.lower() not in LINEUP_SKIP]


def clean_url(u):
    u = (u or "").strip()
    if not u or u in WRONG_URLS:
        return None
    sp = urlsplit(u)
    query = [
        (k, v)
        for k, v in parse_qsl(sp.query, keep_blank_values=True)
        if not (k.startswith("utm_") or k == "fbclid")
    ]
    return urlunsplit((sp.scheme, sp.netloc, sp.path, urlencode(query), sp.fragment))


def same_venue(a, b):
    a, b = norm(a), norm(b)
    if a == b:
        return True
    return any(a in g and b in g for g in ({norm(v) for v in grp} for grp in VENUE_GROUPS))


def same_title(a, b):
    a, b = norm(a), norm(b)
    return bool(a and b) and (a in b or b in a or (len(a) >= 8 and a[:8] in b))


def load_existing(root):
    """Return (normalized venue -> most used spelling, date -> events) for data/."""
    existing = []
    for path in glob.glob(os.path.join(root, "data", "*.json")):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):  # skips raw RA dumps (1.json to 6.json)
            existing += data
    canonical = {}
    for venue, _ in collections.Counter(e["venue"] for e in existing).most_common():
        canonical.setdefault(norm(venue), venue.strip())
    by_date = collections.defaultdict(list)
    for e in existing:
        by_date[e["date"]].append(e)
    return canonical, by_date


def write_events(path, events, root):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nWrote {len(events)} events to {os.path.relpath(path, root)}")


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    today = datetime.date.today().isoformat()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    ap.add_argument("--from-date", default=today, help="earliest event date (default: today)")
    ap.add_argument("--output", default=os.path.join(root, "data", f"{today}-onlytechno-events.json"))
    args = ap.parse_args()

    if not args.dry_run and os.path.exists(args.output):
        sys.exit(f"{args.output} already exists; pass --output to choose another name")

    canonical, by_date = load_existing(root)
    records = fetch_records()
    new, dups, no_venue = [], [], []
    for rec in records:
        f = {k: rec["fields"].get(fid) for k, fid in FIELDS.items()}
        if label(f["city"]) != CITY or (f["date"] or "") < args.from_date:
            continue
        venue = label(f["venue"]).strip()
        venue = VENUE_ALIASES.get(venue, venue)
        venue = canonical.get(norm(venue), venue)
        event = {
            "title": (f["title"] or "").strip(),
            "venue": venue,
            "date": f["date"],
            "startTime": START_TIME,
            "artists": split_lineup(f["lineup"]),
        }
        url = clean_url(f["ticket"])
        if url:
            event["url"] = url
        matches = [
            e
            for e in by_date.get(event["date"], [])
            if (venue and same_venue(e["venue"], venue)) or same_title(e["title"], event["title"])
        ]
        if matches:
            dups.append((event, matches))
        elif not venue:
            no_venue.append(event)
        else:
            new.append(event)

    key = lambda e: (e["date"], e["venue"], e["title"])
    new.sort(key=key)
    known = {norm(v) for v in canonical.values()}

    print(f"{len(records)} records fetched; {CITY} from {args.from_date}: "
          f"{len(new)} new, {len(dups)} already in data/, {len(no_venue)} without venue")
    print("\n== Already in data/ (source -> existing) ==")
    for event, matches in sorted(dups, key=lambda d: key(d[0])):
        found = " ;; ".join(f"{m['venue']}: {m['title']}" for m in matches)
        print(f"{event['date']} | {event['venue']} | {event['title']}  ->  {found[:140]}")
    print("\n== Skipped: no venue in source ==")
    for event in sorted(no_venue, key=key):
        print(f"{event['date']} | {event['title']}")
    print("\n== New ==")
    for event in new:
        flags = []
        if norm(event["venue"]) not in known:
            flags.append("UNKNOWN VENUE: add to VENUE_ALIASES if it is a variant")
        if "url" not in event:
            flags.append("no url")
        if not event["artists"]:
            flags.append("no artists")
        suffix = f"  [{'; '.join(flags)}]" if flags else ""
        print(f"{event['date']} | {event['venue']} | {event['title']}{suffix}")

    if not args.dry_run and new:
        write_events(args.output, new, root)


if __name__ == "__main__":
    main()

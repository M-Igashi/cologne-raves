#!/usr/bin/env python3
import json
import hashlib
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path.home() / "Projects" / "cologne-raves"
DATA_DIR = PROJECT_DIR / "data"

def normalize_string(s):
    if not s:
        return ""
    return s.lower().strip()

def generate_event_hash(title, date, venue):
    key = f"{normalize_string(title)}_{normalize_string(date)}_{normalize_string(venue)}"
    return hashlib.md5(key.encode()).hexdigest()[:8]

def load_existing_events():
    existing_events = {}
    
    for json_file in DATA_DIR.glob("*.json"):
        if json_file.name in ["manifest.json", "1.json", "2.json", "3.json", "4.json", "5.json"]:
            continue
            
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                if isinstance(data, list):
                    events_list = data
                elif "events" in data:
                    events_list = data["events"]
                else:
                    continue
                
                for event in events_list:
                    event_name = event.get("title") or event.get("name", "")
                    event_hash = generate_event_hash(
                        event_name,
                        event.get("date", ""),
                        event.get("venue", "")
                    )
                    existing_events[event_hash] = {
                        "id": event.get("id", ""),
                        "url": event.get("url", ""),
                        "name": event_name,
                        "source_file": json_file.name
                    }
        except Exception as e:
            print(f"Warning: Could not load {json_file.name}: {e}")
    
    return existing_events

def convert_ra_to_standard_format(ra_event):
    event = ra_event.get("event", {})
    
    start_time = event.get("startTime", "")
    date = event.get("date", "")
    
    if start_time:
        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        date_str = dt.strftime('%Y-%m-%d')
        time_str = dt.strftime('%H:%M')
    else:
        dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        date_str = dt.strftime('%Y-%m-%d')
        time_str = "23:00"
    
    artists = [artist.get("name", "") for artist in event.get("artists", [])]
    
    venue = event.get("venue", {})
    venue_name = venue.get("name", "")
    
    content_url = event.get("contentUrl", "")
    ra_url = f"https://ra.co{content_url}" if content_url else ""
    
    standard_event = {
        "id": "",
        "venue": venue_name,
        "date": date_str,
        "title": event.get("title", ""),
        "artists": artists,
        "startTime": time_str,
        "url": ra_url
    }
    
    return standard_event

def process_new_events():
    print("既存イベントを読み込み中...")
    existing_events = load_existing_events()
    print(f"既存イベント数: {len(existing_events)}")
    
    new_events = []
    for i in range(1, 6):
        json_file = DATA_DIR / f"{i}.json"
        if not json_file.exists():
            continue
            
        print(f"\n{json_file.name} を処理中...")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        event_listings = data.get("data", {}).get("eventListings", {}).get("data", [])
        
        for listing in event_listings:
            standard_event = convert_ra_to_standard_format(listing)
            
            event_hash = generate_event_hash(
                standard_event["title"],
                standard_event["date"],
                standard_event["venue"]
            )
            
            if event_hash in existing_events:
                existing = existing_events[event_hash]
                existing_url = existing.get("url", "")
                
                if existing_url and not existing_url.startswith("https://ra.co"):
                    print(f"  ⚠️  スキップ: {standard_event['title']} (既存URL: {existing_url})")
                    continue
                
                standard_event["id"] = existing["id"]
                print(f"  ✓ 既存: {standard_event['title']} (ID: {existing['id']})")
            else:
                print(f"  + 新規: {standard_event['title']}")
            
            new_events.append(standard_event)
    
    output_file = DATA_DIR / "2025-10-cologne-06-new-events.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_events, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 処理完了: {len(new_events)} イベントを {output_file.name} に出力しました")
    print(f"   - 既存イベント: {sum(1 for e in new_events if e['id'])}")
    print(f"   - 新規イベント: {sum(1 for e in new_events if not e['id'])}")

if __name__ == "__main__":
    process_new_events()

#!/usr/bin/env python3
import json
import hashlib
from datetime import datetime
from pathlib import Path

# スクリプトのディレクトリを基準にプロジェクトディレクトリを設定
PROJECT_DIR = Path(__file__).parent.resolve()
DATA_DIR = PROJECT_DIR / "data"

EXISTING_RA_URLS = {
    "https://ra.co/events/2157837",
    "https://ra.co/events/2183392",
    "https://ra.co/events/2232438",
    "https://ra.co/events/2235008",
    "https://ra.co/events/2237078",
    "https://ra.co/events/2243597",
    "https://ra.co/events/2257508",
    "https://ra.co/events/2258087",
    "https://ra.co/events/2267756",
    "https://ra.co/events/2271023",
    "https://ra.co/events/2271086",
    "https://ra.co/events/2271090",
    "https://ra.co/events/2271096",
    "https://ra.co/events/2271100",
    "https://ra.co/events/2271104",
    "https://ra.co/events/2271119",
    "https://ra.co/events/2271128",
    "https://ra.co/events/2272536",
    "https://ra.co/events/2275774",
    "https://ra.co/events/2275899",
}

def normalize_string(s):
    """文字列を正規化（小文字化、空白除去、特殊文字の統一）"""
    if not s:
        return ""
    # 小文字化
    s = s.lower().strip()
    # 複数の空白を1つに
    s = ' '.join(s.split())
    # よくある表記ゆれを統一
    s = s.replace('kitkatclub', 'kitkat club')
    s = s.replace('kit kat club', 'kitkat club')
    # ハイフンとアンダースコアを空白に
    s = s.replace('-', ' ').replace('_', ' ')
    # 連続する空白を1つに
    s = ' '.join(s.split())
    return s

def normalize_title_for_matching(title):
    """タイトルをマッチング用に正規化（より緩い）"""
    normalized = normalize_string(title)
    
    # "with"以降のアーティスト名を除去（例: "ANTEA with Yanamaste, RUIZ..." -> "antea"）
    if ' with ' in normalized:
        normalized = normalized.split(' with ')[0].strip()
    if ' w/ ' in normalized:
        normalized = normalized.split(' w/ ')[0].strip()
    if ' w ' in normalized:
        normalized = normalized.split(' w ')[0].strip()
    
    # "tour", "presents", "pres." などの一般的なサフィックスを除去
    suffixes = [' tour', ' presents', ' pres.', ' pres', ' feat.', ' feat', ' ft.', ' ft']
    for suffix in suffixes:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()
    
    return normalized

def generate_event_hash(title, date, venue):
    """イベントのハッシュ値を生成（厳密な一致用）"""
    key = f"{normalize_string(title)}_{normalize_string(date)}_{normalize_string(venue)}"
    return hashlib.md5(key.encode()).hexdigest()[:8]

def generate_loose_event_key(title, date, venue):
    """緩いマッチング用のキー（類似イベント検出用）"""
    normalized_title = normalize_title_for_matching(title)
    normalized_venue = normalize_string(venue)
    return f"{normalized_title}_{date}_{normalized_venue}"

def load_existing_events():
    """既存のイベントを読み込み、厳密なハッシュと緩いキーの両方を保持"""
    existing_events_by_hash = {}
    existing_events_by_loose_key = {}
    
    for json_file in DATA_DIR.glob("*.json"):
        if json_file.name in ["manifest.json", "1.json", "2.json", "3.json", "4.json"]:
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
                    event_date = event.get("date", "")
                    event_venue = event.get("venue", "")
                    event_url = event.get("url", "")
                    event_id = event.get("id", "")
                    
                    event_info = {
                        "id": event_id,
                        "url": event_url,
                        "name": event_name,
                        "date": event_date,
                        "venue": event_venue,
                        "source_file": json_file.name
                    }
                    
                    # 厳密なハッシュで保存
                    event_hash = generate_event_hash(event_name, event_date, event_venue)
                    existing_events_by_hash[event_hash] = event_info
                    
                    # 緩いキーでも保存
                    loose_key = generate_loose_event_key(event_name, event_date, event_venue)
                    if loose_key not in existing_events_by_loose_key:
                        existing_events_by_loose_key[loose_key] = []
                    existing_events_by_loose_key[loose_key].append(event_info)
                    
        except Exception as e:
            print(f"Warning: Could not load {json_file.name}: {e}")
    
    return existing_events_by_hash, existing_events_by_loose_key

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
    existing_by_hash, existing_by_loose_key = load_existing_events()
    print(f"既存イベント数: {len(existing_by_hash)}")
    print(f"緩いキー数: {len(existing_by_loose_key)}")
    
    new_events = []
    skipped_events = []
    
    for i in range(1, 5):
        json_file = DATA_DIR / f"{i}.json"
        if not json_file.exists():
            print(f"  ⚠️  {i}.json が見つかりません")
            continue
            
        print(f"\n{json_file.name} を処理中...")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        event_listings = data.get("data", {}).get("eventListings", {}).get("data", [])
        
        for listing in event_listings:
            standard_event = convert_ra_to_standard_format(listing)
            
            # 厳密なハッシュでチェック
            event_hash = generate_event_hash(
                standard_event["title"],
                standard_event["date"],
                standard_event["venue"]
            )
            
            # 緩いキーでチェック
            loose_key = generate_loose_event_key(
                standard_event["title"],
                standard_event["date"],
                standard_event["venue"]
            )
            
            # まず厳密なハッシュで一致をチェック
            if event_hash in existing_by_hash:
                existing = existing_by_hash[event_hash]
                existing_url = existing.get("url", "")
                
                if existing_url and not existing_url.startswith("https://ra.co"):
                    print(f"  ⏭️  スキップ (厳密一致): {standard_event['title']}")
                    print(f"      既存: {existing['name']} (URL: {existing_url})")
                    skipped_events.append({
                        "ra_event": standard_event,
                        "existing_event": existing,
                        "reason": "exact_match_non_ra"
                    })
                    continue
                
                standard_event["id"] = existing["id"]
                print(f"  ✓ 既存 (厳密一致): {standard_event['title']} (ID: {existing['id']})")
            
            # 厳密一致しない場合、緩いキーでチェック
            elif loose_key in existing_by_loose_key:
                candidates = existing_by_loose_key[loose_key]
                
                # 非Ra.co URLの候補があるかチェック
                non_ra_candidates = [c for c in candidates if c["url"] and not c["url"].startswith("https://ra.co")]
                
                if non_ra_candidates:
                    existing = non_ra_candidates[0]
                    print(f"  ⏭️  スキップ (類似一致): {standard_event['title']}")
                    print(f"      既存: {existing['name']} (URL: {existing['url']})")
                    skipped_events.append({
                        "ra_event": standard_event,
                        "existing_event": existing,
                        "reason": "similar_match_non_ra"
                    })
                    continue
                
                # Ra.co URLの候補がある場合は既存IDを使用
                ra_candidates = [c for c in candidates if c["url"] and c["url"].startswith("https://ra.co")]
                if ra_candidates:
                    existing = ra_candidates[0]
                    standard_event["id"] = existing["id"]
                    print(f"  ✓ 既存 (類似一致): {standard_event['title']} (ID: {existing['id']})")
                    print(f"      既存: {existing['name']}")
            
            # 新規イベント
            if not standard_event["id"]:
                print(f"  + 新規: {standard_event['title']}")
            
            new_events.append(standard_event)
    
    # 出力ファイル名を今日の日付で作成
    today = datetime.now().strftime("%Y-%m-%d")
    output_file = DATA_DIR / f"{today}-new-ra-events.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_events, f, ensure_ascii=False, indent=2)
    
    # スキップされたイベントのレポートを出力
    if skipped_events:
        report_file = DATA_DIR / f"{today}-skipped-events-report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(skipped_events, f, ensure_ascii=False, indent=2)
        print(f"\n📄 スキップレポート: {report_file.name} に {len(skipped_events)} 件のスキップイベントを記録")
    
    print(f"\n✅ 処理完了: {len(new_events)} イベントを {output_file.name} に出力しました")
    print(f"   - 既存イベント（IDあり）: {sum(1 for e in new_events if e['id'])}")
    print(f"   - 新規イベント（ID空）: {sum(1 for e in new_events if not e['id'])}")
    print(f"   - スキップ: {len(skipped_events)} イベント")

if __name__ == "__main__":
    process_new_events()

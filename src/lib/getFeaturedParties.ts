import { getAllParties } from './getAllParties';

/**
 * Europe/Berlin タイムゾーンでの現在時刻を返す
 */
function getBerlinNow(): Date {
  const berlinOffsetMs = 60 * 60 * 1000; // CET は UTC+1（ただし夏時間には非対応）
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + berlinOffsetMs);
}

/**
 * 「今週のイベント」表示対象となる範囲を返す
 * - 月曜13時以前 → 前週金曜〜今週木曜
 * - 月曜13時以降 → 今週金曜〜来週木曜
 */
function getFeaturedDateRange(now: Date): { from: Date; to: Date } {
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const date = new Date(now);
  const hour = date.getHours();

  // 月曜13時以降を基準とする
  const isAfterMonday13 = day > 1 || (day === 1 && hour >= 13);
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);

  const from = new Date(base);
  from.setDate(from.getDate() + (isAfterMonday13 ? (5 - day) : (day <= 5 ? -2 - day : 5 - day - 7))); // Friday

  const to = new Date(from);
  to.setDate(from.getDate() + 6); // Thursday

  return { from, to };
}

/**
 * 今週の注目イベントを返す
 * - Europe/Berlin 時刻での現在時刻を基準に判断
 * - getAllParties() の出力をフィルタ・ソートして返す
 */
export async function getFeaturedParties() {
  const all = await getAllParties();

  const now = getBerlinNow();
  const { from, to } = getFeaturedDateRange(now);

  return all
    .filter(p => {
      const d = new Date(p.date);
      return d >= from && d <= to;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
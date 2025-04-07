import { getAllParties, Party } from './getAllParties';

function getBerlinNow(): Date {
  const now = new Date();
  const berlinOffset = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now).reduce((acc: any, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return new Date(`${berlinOffset.year}-${berlinOffset.month}-${berlinOffset.day}T${berlinOffset.hour}:${berlinOffset.minute}:${berlinOffset.second}+01:00`);
  }

  function getFeaturedDateRange(): { start: Date; end: Date } {
    const now = getBerlinNow();
    const day = now.getDay();

    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const monday13 = new Date(monday);
    monday13.setHours(13, 0, 0, 0);

    if (now >= monday13) {
      return { start: monday, end: sunday };
    } else {
      const lastFriday = new Date(monday);
      lastFriday.setDate(monday.getDate() - 3);
      lastFriday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(monday);
      lastSunday.setDate(monday.getDate() - 1);
      lastSunday.setHours(23, 59, 59, 999);

      return { start: lastFriday, end: lastSunday };
    }
  }

  export async function getFeaturedParties(): Promise<Party[]> {
    const allParties = await getAllParties();
    const { start, end } = getFeaturedDateRange();

    return allParties
      .filter(p => {
        const date = new Date(p.date);
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
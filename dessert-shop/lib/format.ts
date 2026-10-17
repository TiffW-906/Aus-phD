const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export const money = (n: number) => `$${n.toLocaleString('zh-TW')}`;

/** "2026-10-23" → "10/23（五）" */
export function shortDate(date: string) {
  const [, m, d] = date.split('-').map(Number);
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${m}/${d}（${WEEKDAY[wd]}）`;
}

/** Postgres time "13:30:00" → "13:30" */
export const hhmm = (t: string) => t.slice(0, 5);

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** ISO weekdays [1,2,3,4] → "週一至週四" */
export function weekdaysText(days: number[]) {
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY[d % 7]);
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `週${names[0]}至週${names[names.length - 1]}`;
  return `週${names.join('、')}`;
}

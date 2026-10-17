'use client';
import { useState } from 'react';
import { addDays } from '@/lib/pickup';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

export type DayView = { disabled?: boolean; className?: string; note?: string };

/** Month grid (weeks start on Monday). `day` decides how each date looks and whether it can be clicked. */
export function Calendar({
  initialMonth,
  minMonth,
  maxMonth,
  day,
  onSelect,
}: {
  initialMonth: string; // YYYY-MM
  minMonth?: string;
  maxMonth?: string;
  day: (date: string) => DayView;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(initialMonth);
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const shift = (n: number) => {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const navBtn = 'grid size-9 place-items-center rounded-full text-brick hover:bg-blush-light disabled:text-line';

  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="上個月" className={navBtn} disabled={!!minMonth && month <= minMonth} onClick={() => shift(-1)}>
          ‹
        </button>
        <p className="font-bold">
          {Number(month.slice(0, 4))} 年 {Number(month.slice(5, 7))} 月
        </p>
        <button type="button" aria-label="下個月" className={navBtn} disabled={!!maxMonth && month >= maxMonth} onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const v = day(date);
          return (
            <button
              key={date}
              type="button"
              disabled={v.disabled}
              onClick={() => onSelect(date)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm disabled:cursor-not-allowed disabled:text-line ${v.className ?? ''}`}
            >
              <span>{Number(date.slice(8))}</span>
              {v.note && <span className="max-w-full truncate px-0.5 text-[10px] leading-tight">{v.note}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

export function Stepper({ value, min = 0, max = 99, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const btn = 'grid size-8 place-items-center rounded-full text-lg text-brick disabled:text-line';
  return (
    <div className="inline-flex items-center justify-between rounded-full border border-line bg-white">
      <button type="button" aria-label="減少" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="min-w-6 text-center font-medium tabular-nums">{value}</span>
      <button type="button" aria-label="增加" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

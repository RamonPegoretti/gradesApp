import { capAverage, format2, roundQuarter } from '../lib/grades';

/** Subject average: 2 decimals with the quarter-rounded value beside it, or "-" (spec §6.1). Takes the real average and shows it capped at 6. */
export function SubjectAvg({ value: real, quarterTitle }: { value: number | null; quarterTitle?: string }) {
  const value = capAverage(real);
  if (value === null) return <span className="avg">-</span>;
  return (
    <span className="avg">
      {format2(value)}
      <span className="quarter" title={quarterTitle}>
        {roundQuarter(value).toFixed(2)}
      </span>
    </span>
  );
}

/** Overall average: 2 decimals only (spec §6.2). */
export function OverallAvg({ value }: { value: number | null }) {
  return <span className="avg">{value === null ? '-' : format2(value)}</span>;
}

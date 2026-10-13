import { format2, roundQuarter } from '../lib/grades';

/** Subject average: 2 decimals with the quarter-rounded value beside it, or "-" (spec §6.1). */
export function SubjectAvg({ value, quarterTitle }: { value: number | null; quarterTitle?: string }) {
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

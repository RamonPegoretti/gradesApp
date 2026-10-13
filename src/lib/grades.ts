// Grade parsing and all calculations from the spec (§3, §6, §7.3).
// Pure functions only, so they can be unit tested without Supabase.

export interface Grade {
  id: number; // order of entry (never shown)
  subject_id: number;
  value: number;
  weight: number;
}

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: 'empty' | 'comma' | 'format' | 'sign_decimal' | 'range' };

const NUMBER_RE = /^(\d+(\.\d*)?|\.\d+)$/;

/** Parses a grade typed by the student: any decimal 0–6, or a whole number with + / - (±0.25). */
export function parseGrade(input: string): ParseResult {
  const s = input.trim();
  if (s === '') return { ok: false, error: 'empty' };
  if (s.includes(',')) return { ok: false, error: 'comma' };

  const sign = s.endsWith('+') ? 1 : s.endsWith('-') ? -1 : 0;
  const body = sign === 0 ? s : s.slice(0, -1).trim();
  if (!NUMBER_RE.test(body)) return { ok: false, error: 'format' };
  if (sign !== 0 && !/^\d+$/.test(body)) return { ok: false, error: 'sign_decimal' };

  const value = Number(body) + sign * 0.25;
  if (!(value >= 0 && value <= 6)) return { ok: false, error: 'range' };
  return { ok: true, value };
}

/** Parses a weight: any value ≥ 0, empty means 1. */
export function parseWeight(input: string): ParseResult {
  const s = input.trim();
  if (s === '') return { ok: true, value: 1 };
  if (s.includes(',')) return { ok: false, error: 'comma' };
  if (!NUMBER_RE.test(s)) return { ok: false, error: 'format' };
  return { ok: true, value: Number(s) };
}

/** Parses a plain non-negative decimal (target average). */
export function parseDecimal(input: string): ParseResult {
  const s = input.trim();
  if (s === '') return { ok: false, error: 'empty' };
  if (s.includes(',')) return { ok: false, error: 'comma' };
  if (!NUMBER_RE.test(s)) return { ok: false, error: 'format' };
  return { ok: true, value: Number(s) };
}

// Rounding is mathematical, halves go up (5.125 -> 5.13 / 5.25).
// toPrecision(12) removes binary noise such as 1.005 * 100 = 100.49999999999999.
function roundTo(x: number, steps: number): number {
  return Math.round(Number((x * steps).toPrecision(12))) / steps;
}

export const round2 = (x: number) => roundTo(x, 100);
export const roundQuarter = (x: number) => roundTo(x, 4);

/** "5.32" */
export const format2 = (x: number) => round2(x).toFixed(2);

/** Raw stored number as the student entered it ("4.37", "5", "5.25"). */
export const formatRaw = (x: number) => String(Number(x));

/** Weighted average Σ(grade×weight)/Σ(weight); null when there is no counting grade. */
export function subjectAverage(grades: Pick<Grade, 'value' | 'weight'>[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const g of grades) {
    sum += Number(g.value) * Number(g.weight);
    weights += Number(g.weight);
  }
  return weights > 0 ? sum / weights : null;
}

/** Mean of the exact subject averages, each subject counting equally; subjects without an average are left out. */
export function overallAverage(subjectAverages: (number | null)[]): number | null {
  const counted = subjectAverages.filter((a): a is number => a !== null);
  if (counted.length === 0) return null;
  return counted.reduce((a, b) => a + b, 0) / counted.length;
}

export type TargetResult =
  | { kind: 'needed'; value: number }
  | { kind: 'unreachable' }
  | { kind: 'achieved' };

/**
 * Grade needed on each of the N remaining grades (weight 1 each) to reach the target:
 * needed = (target × (W + N) − S) / N.
 */
export function neededGrade(
  grades: Pick<Grade, 'value' | 'weight'>[],
  target: number,
  remaining: number,
): TargetResult {
  let s = 0;
  let w = 0;
  for (const g of grades) {
    s += Number(g.value) * Number(g.weight);
    w += Number(g.weight);
  }
  const needed = (target * (w + remaining) - s) / remaining;
  const eps = 1e-9;
  if (needed > 6 + eps) return { kind: 'unreachable' };
  if (needed < -eps) return { kind: 'achieved' };
  return { kind: 'needed', value: Math.max(0, needed) };
}

// Distribution bands (spec §7.3d): below 4, 4–4.75, 5–5.75, 6.
// OPEN QUESTION for Ramon: the spec's bands leave gaps for free decimals (e.g. 4.8 or 5.9).
// Until he decides, a band runs up to the next band's start: [4, 5), [5, 6), and 6 exactly.
export const BANDS = ['< 4', '4 – 4.75', '5 – 5.75', '6'] as const;

export function bandIndex(value: number): number {
  if (value < 4) return 0;
  if (value < 5) return 1;
  if (value < 6) return 2;
  return 3;
}

export function distribution(grades: Pick<Grade, 'value'>[]): number[] {
  const counts = [0, 0, 0, 0];
  for (const g of grades) counts[bandIndex(Number(g.value))]++;
  return counts;
}

/**
 * Overall average after each grade, replaying the grades in order of entry.
 * Returns one point per grade; null while no subject has a counting grade yet.
 */
export function overallTimeline(grades: Grade[]): (number | null)[] {
  const sorted = [...grades].sort((a, b) => a.id - b.id);
  const bySubject = new Map<number, Grade[]>();
  const points: (number | null)[] = [];
  for (const g of sorted) {
    const list = bySubject.get(g.subject_id) ?? [];
    list.push(g);
    bySubject.set(g.subject_id, list);
    points.push(overallAverage([...bySubject.values()].map(subjectAverage)));
  }
  return points;
}

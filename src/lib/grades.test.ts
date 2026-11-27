import { describe, expect, it } from 'vitest';
import {
  bandIndex,
  capAverage,
  distribution,
  format2,
  neededGrade,
  overallAverage,
  overallTimeline,
  parseGrade,
  parseWeight,
  round2,
  roundQuarter,
  subjectAverage,
} from './grades';

describe('parseGrade', () => {
  it('accepts any decimal from 0 up, with no upper limit', () => {
    expect(parseGrade('7')).toEqual({ ok: true, value: 7 });
    expect(parseGrade('12.5')).toEqual({ ok: true, value: 12.5 });
    expect(parseGrade('4.37')).toEqual({ ok: true, value: 4.37 });
    expect(parseGrade('0')).toEqual({ ok: true, value: 0 });
    expect(parseGrade('6')).toEqual({ ok: true, value: 6 });
    expect(parseGrade(' 5.5 ')).toEqual({ ok: true, value: 5.5 });
  });

  it('reads signs on whole numbers as ±0.25', () => {
    expect(parseGrade('5+')).toEqual({ ok: true, value: 5.25 });
    expect(parseGrade('6-')).toEqual({ ok: true, value: 5.75 });
    expect(parseGrade('1-')).toEqual({ ok: true, value: 0.75 });
    expect(parseGrade('6+')).toEqual({ ok: true, value: 6.25 });
    expect(parseGrade('7-')).toEqual({ ok: true, value: 6.75 });
    expect(parseGrade('7+')).toEqual({ ok: true, value: 7.25 });
  });

  it('rejects a sign on a non-whole number', () => {
    expect(parseGrade('4.5+')).toEqual({ ok: false, error: 'sign_decimal' });
  });

  it('rejects values below 0', () => {
    expect(parseGrade('0-')).toEqual({ ok: false, error: 'range' });
  });

  it('rejects junk, empty and comma decimals', () => {
    expect(parseGrade('')).toEqual({ ok: false, error: 'empty' });
    expect(parseGrade('abc')).toEqual({ ok: false, error: 'format' });
    expect(parseGrade('-3')).toEqual({ ok: false, error: 'format' });
    expect(parseGrade('4,5')).toEqual({ ok: false, error: 'comma' });
  });
});

describe('parseWeight', () => {
  it('defaults to 1 and accepts any value ≥ 0', () => {
    expect(parseWeight('')).toEqual({ ok: true, value: 1 });
    expect(parseWeight('0')).toEqual({ ok: true, value: 0 });
    expect(parseWeight('2.5')).toEqual({ ok: true, value: 2.5 });
    expect(parseWeight('-1').ok).toBe(false);
  });
});

describe('rounding', () => {
  it('rounds halves up', () => {
    expect(roundQuarter(5.125)).toBe(5.25);
    expect(roundQuarter(5.374)).toBe(5.25);
    expect(roundQuarter(5.375)).toBe(5.5);
    expect(round2(1.005)).toBe(1.01);
    expect(format2(5.325)).toBe('5.33');
    expect(format2(5)).toBe('5.00');
  });
});

describe('averages', () => {
  it('weights the subject average', () => {
    expect(subjectAverage([{ value: 6, weight: 1 }, { value: 4, weight: 3 }])).toBe(4.5);
  });

  it('has no average without counting grades', () => {
    expect(subjectAverage([])).toBeNull();
    expect(subjectAverage([{ value: 5, weight: 0 }])).toBeNull();
  });

  it('weight-0 grades do not count', () => {
    expect(subjectAverage([{ value: 5, weight: 1 }, { value: 2, weight: 0 }])).toBe(5);
  });

  it('overall average uses exact subject averages and skips empty subjects', () => {
    expect(overallAverage([5.125, 4.5, null])).toBeCloseTo(4.8125, 10);
    expect(overallAverage([null])).toBeNull();
  });

  it('subject average is real, and shown capped at 6', () => {
    const real = subjectAverage([{ value: 7, weight: 1 }, { value: 6, weight: 1 }]);
    expect(real).toBe(6.5);
    expect(capAverage(real)).toBe(6);
    expect(capAverage(5.5)).toBe(5.5);
    expect(capAverage(null)).toBeNull();
  });

  it('overall average uses the real subject averages, then caps at 6', () => {
    // real: (7 + 4.5) / 2 = 5.75, not (6 + 4.5) / 2 = 5.25
    expect(overallAverage([7, 4.5])).toBe(5.75);
    expect(overallAverage([7, 6.5])).toBe(6);
  });
});

describe('neededGrade', () => {
  const grades = [{ value: 4, weight: 1 }, { value: 5, weight: 1 }];

  it('computes the grade needed on each remaining grade', () => {
    // (5 × 3 − 9) / 1 = 6
    expect(neededGrade(grades, 5, 1)).toEqual({ kind: 'needed', value: 6 });
    // (5 × 4 − 9) / 2 = 5.5
    expect(neededGrade(grades, 5, 2)).toEqual({ kind: 'needed', value: 5.5 });
  });

  it('shows the needed grade even above 6', () => {
    // (5.5 × 3 − 9) / 1 = 7.5
    expect(neededGrade(grades, 5.5, 1)).toEqual({ kind: 'needed', value: 7.5 });
  });

  it('is already achieved below 0', () => {
    expect(neededGrade([{ value: 6, weight: 10 }], 4, 1)).toEqual({ kind: 'achieved' });
  });

  it('with no grades the target itself is needed', () => {
    expect(neededGrade([], 4.5, 1)).toEqual({ kind: 'needed', value: 4.5 });
  });
});

describe('distribution', () => {
  it('counts grades per band', () => {
    expect(bandIndex(3.99)).toBe(0);
    expect(bandIndex(4)).toBe(1);
    expect(bandIndex(4.75)).toBe(1);
    expect(bandIndex(5)).toBe(2);
    expect(bandIndex(5.75)).toBe(2);
    expect(bandIndex(6)).toBe(3);
    expect(bandIndex(6.25)).toBe(4);
    expect(bandIndex(9)).toBe(4);
    expect(distribution([{ value: 3 }, { value: 4.5 }, { value: 5.25 }, { value: 6 }, { value: 6 }, { value: 6.25 }])).toEqual([1, 1, 1, 2, 1]);
  });
});

describe('overallTimeline', () => {
  it('replays the overall average in order of entry', () => {
    const points = overallTimeline([
      { id: 3, subject_id: 2, value: 4, weight: 1 },
      { id: 1, subject_id: 1, value: 6, weight: 1 },
      { id: 2, subject_id: 1, value: 5, weight: 0 },
    ]);
    expect(points).toEqual([6, 6, 5]);
  });

  it('caps each point at 6', () => {
    const points = overallTimeline([
      { id: 1, subject_id: 1, value: 7, weight: 1 },
      { id: 2, subject_id: 2, value: 4, weight: 1 },
    ]);
    expect(points).toEqual([6, 5.5]);
  });
});

import { describe, it, expect } from 'vitest';
import { bucket, colorFor, type Day } from './themes.js';

// Mirror the real scale values from themes.ts (index 0 = empty/low, 4 = highest).
const GREEN_SCALE = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const OCEAN_SCALE = ['#161b22', '#1f3a68', '#3457d5', '#6f42c1', '#b06bf6'];

function day(count: number, color = ''): Day {
  return { date: '2024-01-01', count, weekday: 1, color };
}

describe('bucket', () => {
  it('returns 0 for a zero (or negative) count', () => {
    expect(bucket(0, 10)).toBe(0);
    expect(bucket(-5, 10)).toBe(0);
  });

  it('returns 1 for a positive count when maxCount <= 0', () => {
    expect(bucket(3, 0)).toBe(1);
    expect(bucket(3, -1)).toBe(1);
  });

  it('maps the maximum count to the highest bucket', () => {
    expect(bucket(10, 10)).toBe(4);
  });

  it('maps intermediate ratios to the expected buckets', () => {
    // ratio thresholds: >0.75 -> 4, >0.5 -> 3, >0.25 -> 2, >0 -> 1
    expect(bucket(8, 10)).toBe(4); // 0.8
    expect(bucket(6, 10)).toBe(3); // 0.6
    expect(bucket(3, 10)).toBe(2); // 0.3
    expect(bucket(1, 10)).toBe(1); // 0.1
  });
});

describe('colorFor — classic (GitHub Green)', () => {
  it('returns the empty/lowest color for a zero count', () => {
    expect(colorFor(day(0), 10, 'classic')).toBe(GREEN_SCALE[0]);
  });

  it('returns the highest green bucket for the max count when no day color', () => {
    expect(colorFor(day(10), 10, 'classic')).toBe(GREEN_SCALE[4]);
  });

  it('maps intermediate counts to the expected green buckets', () => {
    expect(colorFor(day(6), 10, 'classic')).toBe(GREEN_SCALE[3]);
    expect(colorFor(day(3), 10, 'classic')).toBe(GREEN_SCALE[2]);
    expect(colorFor(day(1), 10, 'classic')).toBe(GREEN_SCALE[1]);
  });

  it("returns GitHub's own color verbatim when present", () => {
    expect(colorFor(day(5, '#abcdef'), 10, 'classic')).toBe('#abcdef');
  });
});

describe('colorFor — ocean', () => {
  it('returns the empty/lowest color for a zero count', () => {
    expect(colorFor(day(0), 10, 'ocean')).toBe(OCEAN_SCALE[0]);
  });

  it('returns the highest ocean bucket for the max count', () => {
    expect(colorFor(day(10), 10, 'ocean')).toBe(OCEAN_SCALE[4]);
  });

  it('maps intermediate counts to the expected ocean buckets', () => {
    expect(colorFor(day(6), 10, 'ocean')).toBe(OCEAN_SCALE[3]);
    expect(colorFor(day(3), 10, 'ocean')).toBe(OCEAN_SCALE[2]);
    expect(colorFor(day(1), 10, 'ocean')).toBe(OCEAN_SCALE[1]);
  });

  it('ignores a day color and always uses the computed scale', () => {
    expect(colorFor(day(10, '#abcdef'), 10, 'ocean')).toBe(OCEAN_SCALE[4]);
  });
});

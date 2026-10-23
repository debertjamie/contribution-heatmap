/**
 * Color themes for the contribution bars.
 *
 * - `classic` uses the per-day color string GitHub returns (the familiar green
 *   scale), falling back to a computed green bucket if the string is empty.
 * - `ocean` is computed entirely client-side as a 5-step blue/purple scale
 *   based on the day's count relative to the dataset maximum.
 */

export type ThemeName = 'classic' | 'ocean';

export interface Day {
  date: string;
  count: number;
  weekday: number;
  color: string;
}

export const themes: Record<ThemeName, { label: string }> = {
  classic: { label: 'GitHub Green' },
  ocean: { label: 'Ocean' },
};

// 5-step scales (index 0 = empty/low, index 4 = highest).
const GREEN_SCALE = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const OCEAN_SCALE = ['#161b22', '#1f3a68', '#3457d5', '#6f42c1', '#b06bf6'];

/** Map a count against the dataset max to a 0..4 bucket index. */
function bucket(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  if (maxCount <= 0) return 1;
  const ratio = count / maxCount;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/** Return the CSS color string for a day under the selected theme. */
export function colorFor(day: Day, maxCount: number, theme: ThemeName): string {
  if (theme === 'ocean') {
    return OCEAN_SCALE[bucket(day.count, maxCount)];
  }
  // classic: prefer GitHub's own color, fall back to a green bucket.
  if (day.color && day.color.trim() !== '') {
    return day.color;
  }
  return GREEN_SCALE[bucket(day.count, maxCount)];
}

/** Human-readable duration (AC-31). Keep in sync with apps/web formatDuration. */
export function formatDuration(
  totalSeconds: number,
  locale: 'ru' | 'en' = 'ru',
): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const suf =
    locale === 'ru' ? { h: 'ч', m: 'м', s: 'с' } : { h: 'h', m: 'm', s: 's' };

  if (s === 0) {
    return `0${suf.s}`;
  }

  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}${suf.h}`);
  if (m > 0) parts.push(`${m}${suf.m}`);
  // Seconds only when there are no hours (truncate when hours>0 / showing h+m).
  if (h === 0 && sec > 0) parts.push(`${sec}${suf.s}`);
  return parts.join(' ');
}

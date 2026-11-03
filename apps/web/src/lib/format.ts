/** Live timer clock — always zero-padded hh:mm:ss (hours may exceed 24). */
export function formatElapsedClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

const DURATION_SUFFIX: Record<
  "ru" | "en",
  { hours: string; minutes: string; seconds: string }
> = {
  ru: { hours: "ч", minutes: "м", seconds: "с" },
  en: { hours: "h", minutes: "m", seconds: "s" },
};

function normalizeLocale(locale: string): "ru" | "en" {
  return locale.toLowerCase().startsWith("ru") ? "ru" : "en";
}

/**
 * Closed-duration display (AC-31).
 * Examples: 48ч · 4ч 20м · 2м 5с · 2м · 5с / 48h · 4h 20m · 2m 5s · 2m · 5s
 * When hours > 0, seconds are truncated (never shown): 2ч 26м 19с → 2ч 26м.
 */
export function formatDuration(
  totalSeconds: number,
  locale: string = "ru",
): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const lang = normalizeLocale(locale);
  const s = DURATION_SUFFIX[lang];
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${s.hours}`);
  if (minutes > 0) parts.push(`${minutes}${s.minutes}`);
  // Seconds only when there are no hours (truncate when hours>0 / showing h+m).
  if (hours === 0 && (seconds > 0 || parts.length === 0)) {
    parts.push(`${seconds}${s.seconds}`);
  }
  return parts.join(" ");
}

export function elapsedSince(startIso: string, nowMs = Date.now()): string {
  const startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) {
    return "00:00:00";
  }
  return formatElapsedClock(Math.floor((nowMs - startMs) / 1000));
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocaleDate(d: Date, lang: "ru" | "en"): string {
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  return lang === "ru" ? `${day}.${month}.${year}` : `${month}/${day}/${year}`;
}

function formatClock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Interval display (AC-32).
 * Same-day: "DD.MM.YYYY,\nHH:mm - HH:mm" (en: MM/DD/YYYY).
 * Cross-day: "date HH:mm – date HH:mm".
 * Running (null end): start + ellipsis — no invented end time.
 */
export function formatInterval(
  startIso: string,
  stopIso: string | null,
  locale: string,
): string {
  const lang = normalizeLocale(locale);
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return stopIso ? `${startIso} – ${stopIso}` : `${startIso} - …`;
  }

  if (!stopIso) {
    return `${formatLocaleDate(start, lang)},\n${formatClock(start)} - …`;
  }

  const stop = new Date(stopIso);
  if (Number.isNaN(stop.getTime())) {
    return `${formatLocaleDate(start, lang)} ${formatClock(start)} – ${stopIso}`;
  }

  if (sameCalendarDay(start, stop)) {
    return `${formatLocaleDate(start, lang)},\n${formatClock(start)} - ${formatClock(stop)}`;
  }

  return `${formatLocaleDate(start, lang)} ${formatClock(start)} – ${formatLocaleDate(stop, lang)} ${formatClock(stop)}`;
}

/** Convert ISO to value for datetime-local input (local timezone). */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

/** Monday of the ISO week containing `date` (local calendar). */
export function startOfIsoWeek(date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar date (YYYY-MM-DD) of an ISO timestamp. */
export function localIsoDateFromTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  return toIsoDate(d);
}

/** Human week label, e.g. "3 – 9 Nov 2026". */
export function formatWeekPeriodLabel(weekStart: Date, locale: string): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth =
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear();
  if (sameMonth) {
    const monthYear = weekEnd.toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
    });
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${monthYear}`;
  }
  const startLabel = weekStart.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const endLabel = weekEnd.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayPeriodLabel(day: Date, locale: string): string {
  return day.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Snap minutes to nearest step (default 15). */
export function snapMinutes(date: Date, step = 15): Date {
  const d = new Date(date.getTime());
  const mins = d.getMinutes();
  const snapped = Math.round(mins / step) * step;
  d.setMinutes(snapped, 0, 0);
  if (snapped === 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
  }
  return d;
}

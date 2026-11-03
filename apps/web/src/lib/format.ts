/** Format duration seconds as zero-padded hh:mm:ss (hours may exceed 24). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function elapsedSince(startIso: string, nowMs = Date.now()): string {
  const startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) {
    return "00:00:00";
  }
  return formatDuration(Math.floor((nowMs - startMs) / 1000));
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatInterval(
  startIso: string,
  stopIso: string | null,
  locale: string,
): string {
  const start = new Date(startIso);
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  };
  const startLabel = Number.isNaN(start.getTime())
    ? startIso
    : start.toLocaleString(locale, opts);
  if (!stopIso) {
    return `${startLabel} – …`;
  }
  const stop = new Date(stopIso);
  const stopLabel = Number.isNaN(stop.getTime())
    ? stopIso
    : stop.toLocaleString(locale, opts);
  return `${startLabel} – ${stopLabel}`;
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

import { describe, expect, it } from "vitest";
import { formatInterval } from "../../apps/web/src/lib/format";

/**
 * AC-32 (#63) — interval display via shared util.
 * Same-day: two lines with comma after date; cross-day: compact date HH:mm – date HH:mm.
 * Expected RED until frontend-dev implements AC-32 layout.
 */

function localIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): string {
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

describe("formatInterval · AC-32 (#63)", () => {
  it("same-day ru: DD.MM.YYYY, + newline + HH:mm - HH:mm", () => {
    const start = localIso(2026, 11, 3, 14, 0);
    const end = localIso(2026, 11, 3, 15, 30);
    const text = formatInterval(start, end, "ru");
    expect(text).toBe("03.11.2026,\n14:00 - 15:30");
  });

  it("same-day en: MM/DD/YYYY, + newline + HH:mm - HH:mm", () => {
    const start = localIso(2026, 11, 3, 14, 0);
    const end = localIso(2026, 11, 3, 15, 30);
    const text = formatInterval(start, end, "en");
    expect(text).toBe("11/03/2026,\n14:00 - 15:30");
  });

  it("cross-day ru uses compact date HH:mm – date HH:mm", () => {
    const start = localIso(2026, 11, 3, 22, 0);
    const end = localIso(2026, 11, 4, 1, 15);
    const text = formatInterval(start, end, "ru");
    expect(text).toMatch(
      /^03\.11\.2026 22:00\s+[–-]\s+04\.11\.2026 01:15$/,
    );
    expect(text).not.toContain("\n");
  });

  it("cross-day en uses MM/DD/YYYY order", () => {
    const start = localIso(2026, 11, 3, 22, 0);
    const end = localIso(2026, 11, 4, 1, 15);
    const text = formatInterval(start, end, "en");
    expect(text).toMatch(
      /^11\/03\/2026 22:00\s+[–-]\s+11\/04\/2026 01:15$/,
    );
  });

  it("running (null end) does not invent an end time", () => {
    const start = localIso(2026, 11, 3, 9, 5);
    const text = formatInterval(start, null, "ru");
    expect(text.length).toBeGreaterThan(0);
    // Must mention start clock; must not claim a concrete stop HH:mm as completed range
    expect(text).toMatch(/09:05/);
    expect(text.toLowerCase()).toMatch(/…|\.\.\.|идёт|running/);
    // Same-day completed pattern must NOT appear (would invent end)
    expect(text).not.toMatch(/\n\d{2}:\d{2} - \d{2}:\d{2}$/);
  });
});

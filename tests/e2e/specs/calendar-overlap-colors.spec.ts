import {
  test,
  expect,
  tid,
  byTestId,
  gotoEntries,
  createEmployeeUi,
} from "../fixtures";
import { API_BASE_URL } from "../../helpers/env";

/**
 * AC-38 (#72) calendar overlapping entries side-by-side;
 * AC-45 (#79) calendar entry colors (distinct, not all B/W).
 */
test.describe("AC-38 / AC-45 · calendar overlap & colors", () => {
  test("overlapping entries render side-by-side columns (AC-38 #72)", async ({
    openApp: page,
    request,
  }) => {
    const suffix = Date.now();
    const nameA = `QA Overlap A ${suffix}`;
    const nameB = `QA Overlap B ${suffix}`;
    await createEmployeeUi(page, nameA);
    await createEmployeeUi(page, nameB);

    const empRes = await request.get(`${API_BASE_URL}/employees?limit=50`);
    expect(empRes.ok()).toBeTruthy();
    const empBody = (await empRes.json()) as {
      items?: Array<{ id: string; name: string }>;
    };
    const items = empBody.items ?? [];
    const a = items.find((e) => e.name === nameA);
    const b = items.find((e) => e.name === nameB);
    expect(a?.id && b?.id).toBeTruthy();

    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const startA = new Date(day);
    startA.setHours(10, 0, 0, 0);
    const stopA = new Date(day);
    stopA.setHours(12, 0, 0, 0);
    const startB = new Date(day);
    startB.setHours(10, 30, 0, 0);
    const stopB = new Date(day);
    stopB.setHours(12, 30, 0, 0);

    for (const [emp, start, stop, desc] of [
      [a!, startA, stopA, `overlap-a-${suffix}`],
      [b!, startB, stopB, `overlap-b-${suffix}`],
    ] as const) {
      const res = await request.post(`${API_BASE_URL}/time-entries`, {
        data: {
          employeeId: emp.id,
          description: desc,
          start: start.toISOString(),
          stop: stop.toISOString(),
        },
      });
      expect(res.status()).toBeGreaterThanOrEqual(200);
      expect(res.status()).toBeLessThan(300);
    }

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeDay).click();
    // Jump to today if needed
    const todayBtn = byTestId(page, tid.entriesPeriodToday);
    if (await todayBtn.count()) await todayBtn.click();

    const cal = byTestId(page, tid.entriesCalendar);
    await expect(cal).toBeVisible({ timeout: 15_000 });
    const blockA = cal.locator(`[data-testid^="entries-calendar-block-"]`).filter({
      hasText: `overlap-a-${suffix}`,
    });
    const blockB = cal.locator(`[data-testid^="entries-calendar-block-"]`).filter({
      hasText: `overlap-b-${suffix}`,
    });
    await expect(blockA.first()).toBeVisible({ timeout: 15_000 });
    await expect(blockB.first()).toBeVisible({ timeout: 15_000 });

    const boxA = await blockA.first().boundingBox();
    const boxB = await blockB.first().boundingBox();
    expect(boxA && boxB).toBeTruthy();
    // Side-by-side: different X (columns), not identical full-width opaque stack
    expect(Math.abs(boxA!.x - boxB!.x)).toBeGreaterThan(8);
    // Combined widths should fit roughly within one day column (not both full width)
    const dayCol = cal.locator("[data-day]").first();
    const colBox = (await dayCol.boundingBox()) ?? boxA!;
    expect(boxA!.width + boxB!.width).toBeLessThan(colBox.width * 1.15);
  });

  test("calendar entries use distinct non-monochrome colors (AC-45 #79)", async ({
    openApp: page,
    request,
  }) => {
    const suffix = Date.now();
    const nameA = `QA Color A ${suffix}`;
    const nameB = `QA Color B ${suffix}`;
    await createEmployeeUi(page, nameA);
    await createEmployeeUi(page, nameB);
    const empRes = await request.get(`${API_BASE_URL}/employees?limit=50`);
    const empBody = (await empRes.json()) as {
      items?: Array<{ id: string; name: string }>;
    };
    const items = empBody.items ?? [];
    const a = items.find((e) => e.name === nameA)!;
    const b = items.find((e) => e.name === nameB)!;

    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const mk = async (
      empId: string,
      hour: number,
      desc: string,
    ) => {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const stop = new Date(day);
      stop.setHours(hour + 1, 0, 0, 0);
      const res = await request.post(`${API_BASE_URL}/time-entries`, {
        data: {
          employeeId: empId,
          description: desc,
          start: start.toISOString(),
          stop: stop.toISOString(),
        },
      });
      expect(res.ok()).toBeTruthy();
    };
    await mk(a.id, 9, `color-a-${suffix}`);
    await mk(b.id, 14, `color-b-${suffix}`);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeDay).click();
    const todayBtn = byTestId(page, tid.entriesPeriodToday);
    if (await todayBtn.count()) await todayBtn.click();

    const cal = byTestId(page, tid.entriesCalendar);
    const blockA = cal.locator(`[data-testid^="entries-calendar-block-"]`).filter({
      hasText: `color-a-${suffix}`,
    });
    const blockB = cal.locator(`[data-testid^="entries-calendar-block-"]`).filter({
      hasText: `color-b-${suffix}`,
    });
    await expect(blockA.first()).toBeVisible({ timeout: 15_000 });
    await expect(blockB.first()).toBeVisible({ timeout: 15_000 });

    const colors = await Promise.all(
      [blockA.first(), blockB.first()].map((loc) =>
        loc.evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            bg: cs.backgroundColor,
            border: cs.borderColor || cs.borderTopColor,
            color: cs.color,
          };
        }),
      ),
    );
    // Distinct palette across employees
    expect(colors[0].bg).not.toBe(colors[1].bg);
    // Not pure black/white monochrome for both
    const isNearBw = (c: string) =>
      /^rgba?\(\s*0\s*,\s*0\s*,\s*0/.test(c) ||
      /^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(c) ||
      c === "transparent" ||
      /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(c);
    expect(isNearBw(colors[0].bg) && isNearBw(colors[1].bg)).toBe(false);
  });
});

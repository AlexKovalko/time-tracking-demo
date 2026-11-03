import {
  test,
  expect,
  tid,
  byTestId,
  setReportPeriod,
  gotoReport,
} from "../fixtures";

/**
 * AC-39, AC-40, AC-44, AC-45 (#73, #74, #78, #79) — Report visual amend + colors + week labels.
 */
function seedPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 28);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

test.describe("AC-39/40/44/45 · report chart visuals", () => {
  test("hours-over-time is one compact chart on X buckets (AC-39 #73)", async ({
    openApp: page,
  }) => {
    const { from, to } = seedPeriod();
    await setReportPeriod(page, from, to);

    const chart = byTestId(page, tid.reportChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await byTestId(page, tid.reportChartOverTimeDay).click();

    // Compact axis chart — not a tall per-day horizontal bar list
    await expect(chart).toHaveAttribute("data-chart-layout", "compact");
    const horizontalTracks = chart.locator("ul[role='list'] > li .h-2, ul[role='list'] > li [style*='width']");
    await expect(horizontalTracks).toHaveCount(0);
    await expect(
      chart.locator("svg, canvas, [data-axis='x'], [data-chart-axis='x']").first(),
    ).toBeVisible();

    // Height should stay compact relative to many day rows (≤ ~420px for chart body)
    const box = await chart.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(420);
  });

  test("breakdown is pie/donut with Employees|Подразделения toggle (AC-40 #74)", async ({
    openApp: page,
  }) => {
    await byTestId(page, tid.localeRu).click();
    const { from, to } = seedPeriod();
    await setReportPeriod(page, from, to);

    const chart = byTestId(page, tid.reportChartBreakdown);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await expect(chart).toHaveAttribute("data-chart-type", /^(pie|donut)$/);

    await byTestId(page, tid.reportChartBreakdownEmployees).click();
    await expect(chart).toBeVisible();
    const deptToggle = byTestId(page, tid.reportChartBreakdownDepartments);
    await expect(deptToggle).toContainText(/подразделени/i);
    await deptToggle.click();
    await expect(chart).toBeVisible();

    // Pie/donut visual present
    await expect(
      chart.locator(
        "svg, canvas, [data-chart-type='pie'], [data-chart-type='donut'], .recharts-pie, path",
      ).first(),
    ).toBeVisible();
    // Not the old horizontal bar list as primary viz
    await expect(chart.locator("ul[role='list'] > li .h-2")).toHaveCount(0);
  });

  test("report week mode labels are not ISO Www (AC-44 #78)", async ({
    openApp: page,
  }) => {
    await byTestId(page, tid.localeRu).click();
    const { from, to } = seedPeriod();
    await setReportPeriod(page, from, to);
    await byTestId(page, tid.reportChartOverTimeWeek).click();
    const chart = byTestId(page, tid.reportChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const text = await chart.innerText();
    expect(text).not.toMatch(/\d{4}-W\d{1,2}/);
    if (/\d/.test(text)) {
      expect(text).toMatch(
        /\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}|\d+\s*неделя/i,
      );
    }
  });

  test("charts use distinct colored segments (AC-45 #79)", async ({
    openApp: page,
  }) => {
    const { from, to } = seedPeriod();
    await setReportPeriod(page, from, to);

    const overTime = byTestId(page, tid.reportChartOverTime);
    const breakdown = byTestId(page, tid.reportChartBreakdown);
    await expect(overTime).toBeVisible({ timeout: 15_000 });
    await expect(breakdown).toBeVisible();

    await byTestId(page, tid.reportChartBreakdownEmployees).click();

    const segmentFills = await breakdown.evaluate((root) => {
      const nodes = root.querySelectorAll(
        "[data-segment], path, rect, circle, [role='img']",
      );
      const colors = new Set<string>();
      nodes.forEach((n) => {
        const el = n as HTMLElement;
        const cs = getComputedStyle(el);
        const fill =
          el.getAttribute("fill") ||
          cs.fill ||
          cs.backgroundColor ||
          cs.color;
        if (
          fill &&
          fill !== "none" &&
          fill !== "transparent" &&
          !/^rgba?\(\s*0\s*,\s*0\s*,\s*0/.test(fill) &&
          !/^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(fill)
        ) {
          colors.add(fill);
        }
      });
      return [...colors];
    });
    expect(segmentFills.length).toBeGreaterThanOrEqual(2);

    // Over-time bars also colored (not mono black)
    const overFills = await overTime.evaluate((root) => {
      const nodes = root.querySelectorAll(
        "[data-segment], path, rect, [role='img']",
      );
      const colors = new Set<string>();
      nodes.forEach((n) => {
        const el = n as HTMLElement;
        const cs = getComputedStyle(el);
        const fill =
          el.getAttribute("fill") ||
          cs.fill ||
          cs.backgroundColor;
        if (fill && fill !== "none" && fill !== "transparent") {
          colors.add(fill);
        }
      });
      return [...colors];
    });
    expect(overFills.length).toBeGreaterThan(0);
    expect(
      overFills.every(
        (c) =>
          /^rgba?\(\s*0\s*,\s*0\s*,\s*0/.test(c) ||
          c === "rgb(0, 0, 0)" ||
          c === "#000" ||
          c === "#000000",
      ),
    ).toBe(false);
  });
});

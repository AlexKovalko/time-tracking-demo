import {
  test,
  expect,
  tid,
  byTestId,
  setReportPeriod,
  gotoReport,
} from "../fixtures";

/**
 * AC-16, AC-27…AC-29 (#47, #58–#60) — report seed stats + charts.
 */
test.describe("AC-16 / AC-27…29 · report charts (#47, #58–#60)", () => {
  test("seed period shows meaningful totals for ≥2 employees (AC-16 #47)", async ({
    openApp: page,
  }) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(page, localIso(from), localIso(to));

    const chart = byTestId(page, tid.reportChartBreakdown);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const total = byTestId(page, tid.reportChartBreakdownTotal);
    await expect(total).toBeVisible({ timeout: 15_000 });
    await expect(total).toContainText(/\d/);
    await expect(total).toContainText(/всего часов|total hours/i);
    // Segments + side color legend — at least 2 colored slices
    await expect
      .poll(async () => chart.locator("[data-segment]").count(), {
        timeout: 15_000,
      })
      .toBeGreaterThanOrEqual(2);
  });

  test("hours-over-time chart with day|week toggle (AC-27 #58)", async ({
    openApp: page,
  }) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(
      page,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );

    const chart = byTestId(page, tid.reportChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await expect(byTestId(page, tid.reportChartOverTimeDay)).toBeVisible();
    await expect(byTestId(page, tid.reportChartOverTimeWeek)).toBeVisible();

    await byTestId(page, tid.reportChartOverTimeDay).click();
    await expect(chart).toBeVisible();
    // Non-empty series: bars/svg/canvas or numeric summary inside region
    const content = await chart.innerText();
    const hasVisual = (await chart.locator("svg, canvas, [role='img']").count()) > 0;
    expect(hasVisual || /\d/.test(content)).toBe(true);

    await byTestId(page, tid.reportChartOverTimeWeek).click();
    await expect(chart).toBeVisible();
  });

  test("breakdown chart Employees | Departments (AC-28 #59)", async ({
    openApp: page,
  }) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(
      page,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );

    const chart = byTestId(page, tid.reportChartBreakdown);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await byTestId(page, tid.reportChartBreakdownEmployees).click();
    await expect(chart).toBeVisible();
    await byTestId(page, tid.reportChartBreakdownDepartments).click();
    await expect(chart).toBeVisible();
    const text = await chart.innerText();
    expect(text.length + (await chart.locator("svg, canvas").count())).toBeGreaterThan(
      0,
    );
  });

  test("empty period shows chart empty state without crash (AC-29 #60)", async ({
    openApp: page,
  }) => {
    await setReportPeriod(page, "2099-01-01", "2099-01-02");
    await expect(byTestId(page, tid.reportChartEmpty)).toBeVisible({
      timeout: 15_000,
    });
    // Tabular / CSV chrome still present
    await expect(byTestId(page, tid.reportExportButton)).toBeVisible();
    await expect(byTestId(page, tid.navReport)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  setReportPeriod,
  gotoReport,
} from "../fixtures";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonthBounds() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: localIso(from), to: localIso(to) };
}

test.describe("report polish · donut total, pagination, month defaults", () => {
  test("default date range is current calendar month", async ({
    openApp: page,
  }) => {
    await gotoReport(page);
    const { from, to } = currentMonthBounds();
    await expect(byTestId(page, tid.reportFrom)).toHaveValue(from);
    await expect(byTestId(page, tid.reportTo)).toHaveValue(to);
  });

  test("breakdown shows center total hours and side color legend", async ({
    openApp: page,
  }) => {
    await byTestId(page, tid.localeRu).click();
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(page, localIso(from), localIso(to));

    const chart = byTestId(page, tid.reportChartBreakdown);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await expect(byTestId(page, tid.reportChartBreakdownTotal)).toContainText(
      /всего часов/i,
    );
    await expect(byTestId(page, tid.reportChartBreakdownTotal)).toContainText(
      /\d/,
    );
    // Color legend (dots + name + duration) beside the donut; not the old report-totals block
    const legend = chart.locator("ul[role='list']");
    await expect(legend).toHaveCount(1);
    await expect(legend.locator("li")).not.toHaveCount(0);
    await expect(legend.locator("[data-segment-label]").first()).toBeVisible();
    await expect(page.getByTestId(tid.reportTotals)).toHaveCount(0);
  });

  test("report entries use PaginationBar with on-demand page fetch", async ({
    openApp: page,
  }) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(page, localIso(from), localIso(to));

    const pagination = byTestId(page, tid.reportPagination);
    await expect(pagination).toBeVisible({ timeout: 15_000 });
    await expect(pagination).toContainText(/\d/);

    const pageSize = byTestId(page, `${tid.reportPagination}-page-size`);
    await expect(pageSize).toBeVisible();

    const next = byTestId(page, `${tid.reportPagination}-next`);
    if (!(await next.isDisabled())) {
      const reqPromise = page.waitForRequest(
        (req) =>
          req.url().includes("/api/time-entries") &&
          req.url().includes("page=") &&
          req.url().includes("limit="),
      );
      await next.click();
      const req = await reqPromise;
      expect(req.url()).toMatch(/page=2/);
    }
  });
});

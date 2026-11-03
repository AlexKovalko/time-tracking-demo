import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  setReportPeriod,
} from "../fixtures";

/**
 * Non-regression happy path for time-tracking-ui (AC-4, AC-7, AC-14 smoke)
 * Create employee → sticky Start → live elapsed → Stop → appears in Report.
 */
test.describe("happy path · employee + sticky start/stop + report", () => {
  test("creates employee, starts and stops timer with duration, sees entry in report", async ({
    openApp: page,
  }) => {
    const name = `QA Happy ${Date.now()}`;
    const description = "Happy-path task";

    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);

    const elapsed = byTestId(page, tid.timerElapsed);
    await expect(elapsed).toBeVisible();
    await expect(elapsed).toHaveText(/\d{2}:\d{2}:\d{2}/);

    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);

    const today = new Date().toISOString().slice(0, 10);
    await setReportPeriod(page, today, today);
    await expect(byTestId(page, tid.reportEntries)).toContainText(description, {
      timeout: 15_000,
    });
    await expect(byTestId(page, tid.reportEntries)).toContainText(name);
  });
});

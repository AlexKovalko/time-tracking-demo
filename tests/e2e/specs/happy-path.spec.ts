import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
} from "../fixtures";

/**
 * AC-1, AC-4, AC-5 (+ AC-2 via openApp fixture; AC-13 journey c)
 * Happy path: create employee → start timer → live elapsed → stop.
 */
test.describe("AC-1 / AC-4 / AC-5 · happy path employee + start/stop", () => {
  test("creates employee, starts and stops timer with duration", async ({
    openApp: page,
  }) => {
    const name = `QA Happy ${Date.now()}`;
    const description = "Happy-path task";

    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);

    const elapsed = byTestId(page, tid.timerElapsed);
    await expect(elapsed).toBeVisible();
    // Live elapsed hh:mm:ss (AC-17 surface; required for running state)
    await expect(elapsed).toHaveText(/\d{2}:\d{2}:\d{2}/);

    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);

    // Closed entry should appear in today's report list (AC-5, AC-8 soft check)
    const today = new Date().toISOString().slice(0, 10);
    await byTestId(page, tid.reportFrom).fill(today);
    await byTestId(page, tid.reportTo).fill(today);
    const apply = page.getByRole("button", { name: /показать|show/i });
    if (await apply.count()) {
      await apply.click();
    }
    await expect(byTestId(page, tid.reportEntries)).toContainText(description, {
      timeout: 15_000,
    });
    await expect(byTestId(page, tid.reportEntries)).toContainText(name);
  });
});

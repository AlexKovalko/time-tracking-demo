import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  ensureTimerExpanded,
} from "../fixtures";

/**
 * time-tracking-ui AC-7
 * Sticky timer: Start / Stop / live elapsed / hide / first-hide confirm / restore / Stop while collapsed.
 * Non-regression of baseline AC-17 hide/restore rules on sticky chrome.
 */
test.describe("AC-7 · sticky timer start/stop/hide/restore", () => {
  test("starts with live hh:mm:ss, stops, and supports hide confirm + restore + stop-collapsed", async ({
    openApp: page,
  }) => {
    await page.evaluate(() => {
      localStorage.removeItem("time-tracking-demo.timer.hideConfirmDone");
      localStorage.removeItem("time-tracking-demo.timer.preferCollapsed");
    });
    await page.reload();
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible({
      timeout: 20_000,
    });
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();

    const name = `QA AC7 ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "AC-7 sticky controls");

    const elapsed = byTestId(page, tid.timerElapsed);
    await expect(elapsed).toBeVisible();
    await expect(elapsed).toHaveText(/\d{2}:\d{2}:\d{2}/);

    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerHideButton).click();
    const confirm = byTestId(page, tid.timerHideConfirm);
    await expect(confirm).toBeVisible();
    await byTestId(page, tid.timerHideConfirmHide).click();
    await expect(byTestId(page, tid.timerCollapsed)).toBeVisible();
    await expect(byTestId(page, tid.timerHideConfirm)).toHaveCount(0);

    await byTestId(page, tid.timerRestoreButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toBeVisible();
    await expect(byTestId(page, tid.timerHideButton)).toBeVisible();

    // Second Hide — no confirm
    await byTestId(page, tid.timerHideButton).click();
    await expect(byTestId(page, tid.timerHideConfirm)).toHaveCount(0);
    await expect(byTestId(page, tid.timerCollapsed)).toBeVisible();

    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerCollapsed)).toHaveCount(0);
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);
  });
});

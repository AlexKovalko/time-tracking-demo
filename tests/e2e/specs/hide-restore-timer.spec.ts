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
 * time-tracking-ui AC-7 (baseline hide/restore non-regression)
 * First hide → confirm → hide; restore; stop while collapsed.
 */
test.describe("AC-7 · hide / restore / stop while collapsed", () => {
  test("first hide shows confirm; hide then restore; stop from collapsed", async ({
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

    const name = `QA Hide ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "Hide/restore task");

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

    // Second hide after first Hide choice — no confirm again
    await byTestId(page, tid.timerHideButton).click();
    await expect(byTestId(page, tid.timerHideConfirm)).toHaveCount(0);
    await expect(byTestId(page, tid.timerCollapsed)).toBeVisible();

    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerCollapsed)).toHaveCount(0);
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);
  });
});

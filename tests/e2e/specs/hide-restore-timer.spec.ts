import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
} from "../fixtures";

/**
 * AC-17 (+ AC-5 stop while collapsed)
 * First hide → confirm → hide; restore; stop while collapsed.
 */
test.describe("AC-17 · hide / restore / stop while collapsed", () => {
  test("first hide shows confirm; hide then restore; stop from collapsed", async ({
    openApp: page,
  }) => {
    // Ensure first-hide confirm can appear (clear preference if present)
    await page.evaluate(() => {
      localStorage.removeItem("falconai.timer.hideConfirmDone");
      localStorage.removeItem("falconai.timer.preferCollapsed");
    });
    await page.reload();
    await expect(byTestId(page, tid.employeesNameInput)).toBeVisible();

    const name = `QA Hide ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "Hide/restore task");

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

    // Stop while collapsed (AC-5 / AC-17)
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerCollapsed)).toHaveCount(0);
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);
  });
});

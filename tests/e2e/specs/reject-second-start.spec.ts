import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  selectEmployeeForTimer,
} from "../fixtures";

/**
 * AC-4 (#35) max one running timer
 * Reject second Start while the same employee already has a running timer.
 */
test.describe("AC-4 · reject second Start while running", () => {
  test("shows inline already-running error and keeps a single running timer", async ({
    openApp: page,
  }) => {
    const name = `QA Running ${Date.now()}`;

    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "First task");

    await selectEmployeeForTimer(page, name);
    await byTestId(page, tid.timerDescriptionInput).fill("Second task");
    await byTestId(page, tid.timerStartButton).click();

    const error = byTestId(page, tid.timerAlreadyRunningError);
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toContainText(
      /уже идёт таймер|already has a running timer/i,
    );

    // Elapsed still visible — first timer not auto-stopped
    await expect(byTestId(page, tid.timerElapsed)).toBeVisible();
    await expect(byTestId(page, tid.timerElapsed)).toHaveText(/\d{2}:\d{2}:\d{2}/);
  });
});

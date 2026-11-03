import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
} from "../fixtures";

/**
 * time-tracking-ui AC-7 — after Stop, same employee can Start again.
 */
test.describe("AC-7 · start again after stop", () => {
  test("allows a new Start cycle for the same employee after Stop", async ({
    openApp: page,
  }) => {
    const name = `QA Restart ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "Cycle 1");
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);

    await startTimerUi(page, name, "Cycle 2");
    await expect(byTestId(page, tid.timerElapsed)).toHaveText(/\d{2}:\d{2}:\d{2}/);
    await byTestId(page, tid.timerStopButton).click();
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  gotoEntries,
  gotoReport,
  gotoEmployees,
  stickyTimerRoot,
  ensureTimerExpanded,
} from "../fixtures";

/**
 * time-tracking-ui AC-6
 * Sticky bottom-right timer remains available across section navigation.
 */
test.describe("AC-6 · sticky timer across routes", () => {
  test("timer surface stays bottom-right and visible on Employees / Entries / Report", async ({
    openApp: page,
  }) => {
    const name = `QA Sticky ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "Sticky across routes");

    const assertStickyBottomRight = async () => {
      const root = stickyTimerRoot(page);
      await expect(root).toBeVisible();
      const box = await root.boundingBox();
      const viewport = page.viewportSize();
      expect(box).toBeTruthy();
      expect(viewport).toBeTruthy();
      // Bottom-right quadrant (AC-6 — not mid-page in-flow block only)
      expect(box!.y + box!.height / 2).toBeGreaterThan(viewport!.height * 0.45);
      expect(box!.x + box!.width / 2).toBeGreaterThan(viewport!.width * 0.45);
      await expect(byTestId(page, tid.timerElapsed)).toBeVisible();
    };

    await assertStickyBottomRight();

    await gotoEntries(page);
    await assertStickyBottomRight();

    await gotoReport(page);
    await assertStickyBottomRight();

    await gotoEmployees(page);
    await assertStickyBottomRight();

    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);
  });
});

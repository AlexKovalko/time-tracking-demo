import {
  test,
  expect,
  tid,
  byTestId,
  gotoEntries,
  gotoReport,
  gotoEmployees,
  timerChromeRoot,
} from "../fixtures";

/**
 * AC-3 (#34) complement — timer chrome persists across routes (FAB era).
 * Position smoke only; running badge / hide-restore covered by timer-fab + hide-restore specs.
 */
test.describe("AC-3 · FAB timer across routes (#34)", () => {
  test("FAB/timer chrome stays bottom-right on Employees / Entries / Report", async ({
    openApp: page,
  }) => {
    const assertChrome = async () => {
      const root = timerChromeRoot(page);
      await expect(root).toBeVisible();
      const box = await root.boundingBox();
      const viewport = page.viewportSize();
      expect(box).toBeTruthy();
      expect(viewport).toBeTruthy();
      expect(box!.y + box!.height / 2).toBeGreaterThan(viewport!.height * 0.45);
      expect(box!.x + box!.width / 2).toBeGreaterThan(viewport!.width * 0.45);
    };

    await assertChrome();
    await gotoEntries(page);
    await assertChrome();
    await gotoReport(page);
    await assertChrome();
    await gotoEmployees(page);
    await assertChrome();
    await expect(byTestId(page, tid.timerFab)).toBeVisible();
  });
});

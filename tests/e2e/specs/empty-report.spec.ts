import {
  test,
  expect,
  tid,
  byTestId,
  setReportPeriod,
  stickyTimerRoot,
} from "../fixtures";

/**
 * time-tracking-ui AC-14 (empty report non-regression)
 * Empty report period shows empty state; app does not crash.
 */
test.describe("AC-14 · empty report period", () => {
  test("shows empty state for a far-future period without crashing", async ({
    openApp: page,
  }) => {
    await setReportPeriod(page, "2099-01-01", "2099-01-02");

    await expect(byTestId(page, tid.reportEmpty)).toBeVisible({
      timeout: 15_000,
    });
    await expect(byTestId(page, tid.reportEmpty)).toContainText(
      /записей нет|no entries/i,
    );

    // Totals present and zero-ish / empty — not an error banner
    const totals = byTestId(page, tid.reportTotals);
    if (await totals.count()) {
      await expect(totals).toBeVisible();
    }

    // Export disabled when empty (ux.md preference)
    const exportBtn = byTestId(page, tid.reportExportButton);
    await expect(exportBtn).toBeDisabled();

    // App chrome still usable on Report route (AC-1 / AC-6 / AC-14 shell)
    await expect(page).toHaveURL(/\/report\/?$/);
    await expect(byTestId(page, tid.navReport)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(stickyTimerRoot(page)).toBeVisible();
  });
});

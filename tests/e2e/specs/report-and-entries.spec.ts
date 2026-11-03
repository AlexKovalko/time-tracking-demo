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
 * time-tracking-ui AC-14 — report list/totals + entry delete smoke.
 */
test.describe("AC-14 · report list, totals, entry CRUD smoke", () => {
  test("shows entries and per-employee totals; can delete an entry", async ({
    openApp: page,
  }) => {
    const name = `QA Report ${Date.now()}`;
    const description = `Report list task ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(1100);
    await byTestId(page, tid.timerStopButton).click();

    const today = new Date().toISOString().slice(0, 10);
    await setReportPeriod(page, today, today);

    const entries = byTestId(page, tid.reportEntries);
    await expect(entries).toContainText(description);
    await expect(entries).toContainText(name);

    const totals = byTestId(page, tid.reportTotals);
    await expect(totals).toBeVisible();
    await expect(totals).toContainText(name);

    const row = entries.locator("tbody tr").filter({ hasText: description });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: /удалить|delete/i }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /удалить|delete|confirm/i }).click();

    await expect(entries.getByText(description, { exact: true })).toHaveCount(0);
  });
});

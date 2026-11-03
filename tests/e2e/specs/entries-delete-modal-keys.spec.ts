import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  ensureTimerExpanded,
  gotoEntries,
} from "../fixtures";

/**
 * AC-42 (#76) — delete entry modal: Enter confirms (icon on confirm); Esc closes.
 */
test.describe("AC-42 · delete entry modal Enter/Esc (#76)", () => {
  async function openDeleteDialog(
    page: import("@playwright/test").Page,
    description: string,
  ) {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const today = new Date().toISOString().slice(0, 10);
    await byTestId(page, tid.entriesFilterFrom).fill(today);
    await byTestId(page, tid.entriesFilterTo).fill(today);
    await byTestId(page, tid.entriesFilterQ).fill(description);
    const apply = byTestId(page, tid.entriesFilterApply);
    if (await apply.count()) await apply.click();

    const list = byTestId(page, tid.entriesList);
    await expect(list).toContainText(description, { timeout: 15_000 });
    const row = list.locator(`[data-testid^="entry-row-"]`).filter({
      hasText: description,
    });
    const target =
      (await row.count()) > 0
        ? row.first()
        : list.locator("tbody tr, [role='row']").filter({ hasText: description });
    await target.first().getByRole("button", { name: /удалить|delete/i }).click();

    const dialog = byTestId(page, tid.entriesDeleteDialog);
    // Prefer dedicated testid; fall back to alertdialog role so assertion still fails
    // clearly when eng forgets data-testid.
    if ((await dialog.count()) === 0) {
      await expect(page.getByRole("alertdialog")).toBeVisible();
    } else {
      await expect(dialog).toBeVisible();
    }
  }

  test("Esc closes delete modal without deleting", async ({ openApp: page }) => {
    const name = `QA Del Esc ${Date.now()}`;
    const description = `del-esc-${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(700);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();

    await openDeleteDialog(page, description);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(byTestId(page, tid.entriesList)).toContainText(description);
  });

  test("Enter confirms delete; confirm control has icon", async ({
    openApp: page,
  }) => {
    const name = `QA Del Enter ${Date.now()}`;
    const description = `del-enter-${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(700);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();

    await openDeleteDialog(page, description);

    const confirm = byTestId(page, tid.entriesDeleteConfirm);
    // Eng must wire data-testid="entries-delete-confirm" on primary confirm
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    // Confirm has an icon (svg / img / lucide)
    await expect(confirm.locator("svg, img, [data-icon]").first()).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("alertdialog")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(
      byTestId(page, tid.entriesList).getByText(description, { exact: true }),
    ).toHaveCount(0);
  });
});

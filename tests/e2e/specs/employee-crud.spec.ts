import { test, expect, tid, byTestId, createEmployeeUi } from "../fixtures";

/**
 * AC-15 — full employee CRUD (update + delete after AC-1 create).
 */
test.describe("AC-15 · employee update and delete", () => {
  test("updates name and deletes employee without full page reload", async ({
    openApp: page,
  }) => {
    const original = `QA Emp ${Date.now()}`;
    const renamed = `${original} Renamed`;

    await createEmployeeUi(page, original);

    const list = byTestId(page, tid.employeesList);
    // Prefer stable row testid; fall back to exact name span (renamed contains original as substring).
    let row = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(original, { exact: true }),
    });
    if ((await row.count()) === 0) {
      row = list.getByText(original, { exact: true }).locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }
    await row.getByRole("button", { name: /изменить|edit/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox").fill(renamed);
    await dialog.getByRole("button", { name: /сохранить|save/i }).click();

    // Exact match: renamed ("… Renamed") still contains original as substring — do not use toContainText(original).
    await expect(list.getByText(renamed, { exact: true })).toBeVisible();
    await expect(list.getByText(original, { exact: true })).toHaveCount(0);

    let renamedRow = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(renamed, { exact: true }),
    });
    if ((await renamedRow.count()) === 0) {
      renamedRow = list
        .getByText(renamed, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }
    await renamedRow.getByRole("button", { name: /удалить|delete/i }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /удалить|delete|confirm/i }).click();

    await expect(list.getByText(renamed, { exact: true })).toHaveCount(0);
  });
});

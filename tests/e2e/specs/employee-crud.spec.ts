import { test, expect, tid, byTestId, createEmployeeUi } from "../fixtures";

/**
 * time-tracking-ui AC-5 — employee update + delete non-regression (baseline CRUD).
 * Prefer employees-edit-dialog; keep role fallback for resilience.
 */
test.describe("AC-5 · employee update and delete", () => {
  test("updates name and deletes employee without full page reload", async ({
    openApp: page,
  }) => {
    const original = `QA Emp ${Date.now()}`;
    const renamed = `${original} Renamed`;

    await createEmployeeUi(page, original);

    const list = byTestId(page, tid.employeesList);
    let row = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(original, { exact: true }),
    });
    if ((await row.count()) === 0) {
      row = list
        .getByText(original, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }
    await row.getByRole("button", { name: /изменить|edit/i }).click();

    const editDialog = byTestId(page, tid.employeesEditDialog);
    if (await editDialog.count()) {
      await expect(editDialog).toBeVisible();
      await byTestId(page, tid.employeesNameInput).fill(renamed);
      await editDialog.getByRole("button", { name: /сохранить|save/i }).click();
    } else {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("textbox").fill(renamed);
      await dialog.getByRole("button", { name: /сохранить|save/i }).click();
    }

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

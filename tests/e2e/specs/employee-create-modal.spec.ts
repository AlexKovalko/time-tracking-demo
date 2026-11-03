import { test, expect, tid, byTestId, createEmployeeUi } from "../fixtures";

/**
 * time-tracking-ui AC-4, AC-5
 * Create via Dialog; list + edit + delete on Employees route.
 */
test.describe("AC-4 / AC-5 · employee modal create and CRUD", () => {
  test("creates employee through modal Dialog without full reload (AC-4)", async ({
    openApp: page,
  }) => {
    const name = `QA Modal ${Date.now()}`;

    // Inline create strip must not be the primary path — open control required
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible();
    // Name field not on page until dialog opens
    await expect(byTestId(page, tid.employeesNameInput)).toHaveCount(0);

    await byTestId(page, tid.employeesAddOpen).click();
    const dialog = byTestId(page, tid.employeesCreateDialog);
    await expect(dialog).toBeVisible();
    await expect(byTestId(page, tid.employeesNameInput)).toBeVisible();

    await byTestId(page, tid.employeesNameInput).fill(name);
    await byTestId(page, tid.employeesAddButton).click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/employees\/?$/);
    await expect(byTestId(page, tid.employeesList)).toContainText(name, {
      timeout: 15_000,
    });
  });

  test("lists, edits via dialog, and deletes employee (AC-5)", async ({
    openApp: page,
  }) => {
    const original = `QA EmpUI ${Date.now()}`;
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
    await expect(editDialog).toBeVisible();
    await byTestId(page, tid.employeesNameInput).fill(renamed);
    await editDialog.getByRole("button", { name: /сохранить|save/i }).click();

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

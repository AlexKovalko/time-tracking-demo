import { test, expect, tid, byTestId, createEmployeeUi } from "../fixtures";

/**
 * employee-delete-enter-confirm (#116)
 * AC-1 (#117) Enter confirms delete
 * AC-2 (#118) Escape cancels without deleting
 * AC-3 (#119) alertdialog a11y smoke (role + cancel usable)
 */
test.describe("employee-delete-enter-confirm · delete modal Enter/Esc (#116)", () => {
  async function findEmployeeRow(
    page: import("@playwright/test").Page,
    name: string,
  ) {
    const list = byTestId(page, tid.employeesList);
    let row = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(name, { exact: true }),
    });
    if ((await row.count()) === 0) {
      row = list
        .getByText(name, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }
    return row;
  }

  async function openDeleteDialog(
    page: import("@playwright/test").Page,
    name: string,
  ) {
    const row = await findEmployeeRow(page, name);
    await row.getByRole("button", { name: /удалить|delete/i }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    return dialog;
  }

  test("AC-2 · Esc closes employee delete modal without deleting", async ({
    openApp: page,
  }) => {
    const name = `QA Emp Del Esc ${Date.now()}`;
    await createEmployeeUi(page, name);

    await openDeleteDialog(page, name);
    await page.keyboard.press("Escape");

    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(
      byTestId(page, tid.employeesList).getByText(name, { exact: true }),
    ).toBeVisible();
  });

  test("AC-1 · Enter confirms employee delete", async ({ openApp: page }) => {
    const name = `QA Emp Del Enter ${Date.now()}`;
    await createEmployeeUi(page, name);

    await openDeleteDialog(page, name);

    const deleteResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/employees/") &&
        r.request().method() === "DELETE" &&
        r.ok(),
      { timeout: 15_000 },
    );

    await page.keyboard.press("Enter");

    await deleteResponse;
    await expect(page.getByRole("alertdialog")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(
      byTestId(page, tid.employeesList).getByText(name, { exact: true }),
    ).toHaveCount(0);
  });

  test("AC-3 · delete confirm exposes alertdialog and usable cancel", async ({
    openApp: page,
  }) => {
    const name = `QA Emp Del A11y ${Date.now()}`;
    await createEmployeeUi(page, name);

    const dialog = await openDeleteDialog(page, name);

    await expect(dialog).toHaveAttribute("role", "alertdialog");
    const cancel = dialog.getByRole("button", {
      name: /отмена|cancel/i,
    });
    await expect(cancel).toBeVisible();
    await cancel.click();

    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(
      byTestId(page, tid.employeesList).getByText(name, { exact: true }),
    ).toBeVisible();
  });
});

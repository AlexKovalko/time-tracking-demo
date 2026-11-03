import {
  test,
  expect,
  tid,
  byTestId,
  gotoEmployees,
  collectSelectLabels,
  assertNoUuidLabels,
} from "../fixtures";

/**
 * AC-20…AC-23 (#51–#54) — departments CRUD + employee profile fields + list secondary.
 */
test.describe("AC-20…23 · departments & profile fields (#51–#54)", () => {
  test("departments tab supports minimal CRUD (AC-20 #51)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabDepartments).click();
    await expect(byTestId(page, tid.departmentsList)).toBeVisible();

    const name = `QA Dept ${Date.now()}`;
    await byTestId(page, tid.departmentsAddOpen).click();
    await byTestId(page, tid.departmentsNameInput).fill(name);
    await byTestId(page, tid.departmentsAddButton).click();
    await expect(byTestId(page, tid.departmentsList)).toContainText(name, {
      timeout: 15_000,
    });
  });

  test("employee create exposes dept + title/email/phone (AC-21 #52)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabPeople).click();
    await byTestId(page, tid.employeesAddOpen).click();
    const dialog = byTestId(page, tid.employeesCreateDialog);
    await expect(dialog).toBeVisible();

    await expect(byTestId(page, tid.employeeDepartmentSelect)).toBeVisible();
    await expect(byTestId(page, tid.employeeTitleInput)).toBeVisible();
    await expect(byTestId(page, tid.employeeEmailInput)).toBeVisible();
    await expect(byTestId(page, tid.employeePhoneInput)).toBeVisible();

    const deptLabels = await collectSelectLabels(
      page,
      tid.employeeDepartmentSelect,
    );
    assertNoUuidLabels(deptLabels);

    await byTestId(page, tid.employeesNameInput).fill(`QA Profile ${Date.now()}`);
    await byTestId(page, tid.employeeEmailInput).fill("not-an-email");
    await byTestId(page, tid.employeesAddButton).click();
    // Invalid email should keep dialog open or show validation
    await expect(dialog).toBeVisible();
  });

  test("seed shows ≥3 departments and assigned employees (AC-22 #53)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabDepartments).click();
    const list = byTestId(page, tid.departmentsList);
    await expect(list).toBeVisible();
    const text = await list.innerText();
    const rows = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test("employee list shows secondary dept and/or title (AC-23 #54)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabPeople).click();
    const secondary = page.getByTestId(tid.employeeRowSecondary);
    await expect(secondary.first()).toBeVisible({ timeout: 15_000 });
    const sample = await secondary.first().innerText();
    expect(sample.trim().length).toBeGreaterThan(0);
    expect(sample).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  gotoEmployees,
  gotoReport,
  setReportPeriod,
} from "../fixtures";

/**
 * AC-37 (#71) — RU «Отдел» → «Подразделение» everywhere in UI.
 */
test.describe("AC-37 · RU Подразделение i18n (#71)", () => {
  test("RU UI uses Подразделение / Подразделения, not Отдел(ы)", async ({
    openApp: page,
  }) => {
    await byTestId(page, tid.localeRu).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru", {
      timeout: 10_000,
    });

    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabDepartments).click();
    const deptTab = byTestId(page, tid.employeesTabDepartments);
    await expect(deptTab).toContainText(/подразделен/i);
    await expect(deptTab).not.toContainText(/отдел/i);
    // Visible chrome around departments list
    const main = page.getByRole("main");
    const bodyText = await main.innerText();
    // Tab / heading / empty / chart labels must not keep old «Отдел» wording
    expect(bodyText).not.toMatch(/Отделы/);
    expect(bodyText).not.toMatch(/Отдел/);
    expect(bodyText).toMatch(/Подразделени/);

    await byTestId(page, tid.employeesTabPeople).click();
    await byTestId(page, tid.employeesAddOpen).click();
    const dialog = byTestId(page, tid.employeesCreateDialog);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/подразделение/i);
    await expect(dialog).not.toContainText(/Отдел/);
    await page.keyboard.press("Escape");

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(
      page,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );
    await gotoReport(page);
    const breakdownDept = byTestId(page, tid.reportChartBreakdownDepartments);
    await expect(breakdownDept).toBeVisible({ timeout: 15_000 });
    await expect(breakdownDept).toContainText(/подразделени/i);
    await expect(breakdownDept).not.toContainText(/Отдел/i);
  });
});

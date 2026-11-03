import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  gotoEntries,
} from "../fixtures";

/**
 * employee-filter-placeholder · AC-1 (#113), AC-2 (#114)
 * User clarification: remove «Все сотрудники» entirely from /entries employee
 * filter Combobox (not filled value, not list option). Keep default
 * combobox.employee.placeholder («Найти сотрудника…» / «Search employee…»).
 * Expected RED until frontend-dev changes EmployeeCombobox allowAll behavior.
 */

const ALL_EMPLOYEES = /все сотрудники|all employees/i;
const SEARCH_PLACEHOLDER = /найти сотрудника|search employee/i;

test.describe("AC-1 · filter empty input; placeholder unchanged (#113)", () => {
  test("default «all»: input empty; no filled «Все сотрудники»; search placeholder", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const root = byTestId(page, tid.entriesFilterEmployee);
    await expect(root).toBeVisible({ timeout: 15_000 });

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await expect(input).toBeVisible({ timeout: 10_000 });

    await expect(input).toHaveValue("");
    await expect(input).not.toHaveValue(ALL_EMPLOYEES);
    await expect(root).not.toContainText(ALL_EMPLOYEES);
    await expect(input).toHaveAttribute("placeholder", SEARCH_PLACEHOLDER);
  });
});

test.describe("AC-2 · no all-option; select fills; clear → empty (#114)", () => {
  test("list has no «Все сотрудники»; select name; clear → empty + search placeholder", async ({
    openApp: page,
  }) => {
    const unique = `QA FilterPh ${Date.now()}`;
    await createEmployeeUi(page, unique);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await expect(input).toBeVisible({ timeout: 10_000 });

    await expect(input).toHaveValue("");
    await expect(input).toHaveAttribute("placeholder", SEARCH_PLACEHOLDER);

    await input.click();
    const list = byTestId(page, tid.entriesFilterEmployeeList);
    await expect(list).toBeVisible({ timeout: 10_000 });

    await expect(
      list.getByRole("option", { name: ALL_EMPLOYEES }),
    ).toHaveCount(0);

    await input.fill(unique.slice(0, 14));
    const empOpt = list.getByRole("option", { name: unique });
    await expect(empOpt).toBeVisible({ timeout: 15_000 });
    await empOpt.click();

    await expect(input).toHaveValue(unique);

    const clear = byTestId(page, tid.entriesFilterEmployeeClear);
    await expect(clear).toBeVisible({ timeout: 10_000 });
    await clear.click();

    await expect(input).toHaveValue("");
    await expect(input).not.toHaveValue(ALL_EMPLOYEES);
    await expect(input).toHaveAttribute("placeholder", SEARCH_PLACEHOLDER);

    await input.click();
    await expect(list).toBeVisible({ timeout: 10_000 });
    await expect(
      list.getByRole("option", { name: ALL_EMPLOYEES }),
    ).toHaveCount(0);
  });
});

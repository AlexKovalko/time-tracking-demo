import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  gotoEmployees,
  gotoEntries,
  gotoReport,
  openSeedEmployeeProfile,
  applyProfilePeriod,
  setReportPeriod,
} from "../fixtures";

/**
 * qa write · ui-selectors-pagination-tooltips (#84)
 * AC-1…AC-6 (#85–#90) — expected RED until frontend-dev implements ux.md contract.
 */

async function openSelectOrCombobox(
  page: import("@playwright/test").Page,
  testId: string,
) {
  const trigger = byTestId(page, testId);
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
}

test.describe("AC-1 · department Select in employee Dialog (#85)", () => {
  test("create dialog: department select opens, none → null, dept → id", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabDepartments).click();
    const deptList = byTestId(page, tid.departmentsList);
    await expect(deptList).toBeVisible({ timeout: 15_000 });
    let deptName = (await deptList.innerText())
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 1 && !/пуст|empty|нет/i.test(l));
    if (!deptName) {
      await byTestId(page, tid.departmentsAddOpen).click();
      deptName = `QA Dept ${Date.now()}`;
      await byTestId(page, tid.departmentsNameInput).fill(deptName);
      await byTestId(page, tid.departmentsAddButton).click();
      await expect(deptList).toContainText(deptName, { timeout: 15_000 });
    }

    await byTestId(page, tid.employeesTabPeople).click();
    await byTestId(page, tid.employeesAddOpen).click();
    const dialog = byTestId(page, tid.employeesCreateDialog);
    await expect(dialog).toBeVisible();

    const deptTrigger = byTestId(page, tid.employeeDepartmentSelect);
    await expect(deptTrigger).toBeVisible();
    await deptTrigger.click();

    const content = byTestId(page, tid.employeeDepartmentSelectContent);
    await expect(content).toBeVisible({ timeout: 10_000 });

    const noneItem =
      (await byTestId(page, tid.employeeDepartmentNone).count()) > 0
        ? byTestId(page, tid.employeeDepartmentNone)
        : page.getByRole("option", {
            name: /без подразделения|no department/i,
          });
    await expect(noneItem.first()).toBeVisible();
    await noneItem.first().click();
    await expect(deptTrigger).toContainText(/без подразделения|no department/i);

    const nameNone = `QA NoDept ${Date.now()}`;
    await byTestId(page, tid.employeesNameInput).fill(nameNone);

    const postNone = page.waitForRequest(
      (r) =>
        r.url().includes("/employees") &&
        r.method() === "POST" &&
        !r.url().includes("/stats"),
    );
    await byTestId(page, tid.employeesAddButton).click();
    const reqNone = await postNone;
    const bodyNone = reqNone.postDataJSON() as {
      departmentId?: string | null;
    };
    expect(
      bodyNone.departmentId === null || bodyNone.departmentId === undefined,
    ).toBe(true);
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });

    await byTestId(page, tid.employeesAddOpen).click();
    await expect(byTestId(page, tid.employeesCreateDialog)).toBeVisible();
    await byTestId(page, tid.employeesNameInput).fill(
      `QA WithDept ${Date.now()}`,
    );
    await byTestId(page, tid.employeeDepartmentSelect).click();
    await expect(
      byTestId(page, tid.employeeDepartmentSelectContent),
    ).toBeVisible();
    await page.getByRole("option", { name: deptName!, exact: true }).click();
    await expect(byTestId(page, tid.employeeDepartmentSelect)).toContainText(
      deptName!,
    );

    const postDept = page.waitForRequest(
      (r) =>
        r.url().includes("/employees") &&
        r.method() === "POST" &&
        !r.url().includes("/stats"),
    );
    await byTestId(page, tid.employeesAddButton).click();
    const reqDept = await postDept;
    const bodyDept = reqDept.postDataJSON() as {
      departmentId?: string | null;
    };
    expect(typeof bodyDept.departmentId).toBe("string");
    expect(bodyDept.departmentId).toBeTruthy();
  });

  test("edit dialog: orphan departmentId shows unknown fallback, no crash", async ({
    openApp: page,
  }) => {
    const name = `QA Orphan ${Date.now()}`;
    await createEmployeeUi(page, name);

    const list = byTestId(page, tid.employeesList);
    let row = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(name, { exact: true }),
    });
    if ((await row.count()) === 0) {
      row = list
        .getByText(name, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }

    await row.getByRole("button", { name: /изменить|edit/i }).click();
    const editDialog = byTestId(page, tid.employeesEditDialog);
    await expect(editDialog).toBeVisible();
    await byTestId(page, tid.employeeDepartmentSelect).click();
    await expect(
      byTestId(page, tid.employeeDepartmentSelectContent),
    ).toBeVisible();
    const deptOption = page.getByRole("option").filter({
      hasNotText: /без подразделения|no department|unknown|неизвестн/i,
    });
    await expect(deptOption.first()).toBeVisible({ timeout: 10_000 });
    const assignedLabel = (await deptOption.first().innerText()).trim();
    await deptOption.first().click();
    await editDialog.getByRole("button", { name: /сохранить|save/i }).click();
    await expect(editDialog).toHaveCount(0, { timeout: 15_000 });

    await page.route("**/api/departments**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    row = list.locator(`[data-testid^="employee-row-"]`).filter({
      has: page.getByText(name, { exact: true }),
    });
    if ((await row.count()) === 0) {
      row = list
        .getByText(name, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border')][1]");
    }
    await row.getByRole("button", { name: /изменить|edit/i }).click();
    await expect(byTestId(page, tid.employeesEditDialog)).toBeVisible();

    const trigger = byTestId(page, tid.employeeDepartmentSelect);
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText(/неизвестн|unknown/i);
    await expect(trigger).not.toContainText(assignedLabel);
    await trigger.click();
    await expect(
      byTestId(page, tid.employeeDepartmentSelectContent),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.unroute("**/api/departments**");
  });
});

test.describe("AC-2 · PaginationBar page sizes 10/20/50 (#86)", () => {
  test("employees + entries expose page-size 10/20/50; change → page 1", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    const empPageSize = byTestId(page, tid.employeesPaginationPageSize);
    await expect(empPageSize).toBeVisible({ timeout: 15_000 });
    await expect(empPageSize).toContainText(/20/);

    await empPageSize.click();
    for (const n of ["10", "20", "50"]) {
      await expect(
        page.getByRole("option", { name: new RegExp(`^${n}$`) }),
      ).toBeVisible();
    }
    await expect(page.getByRole("option", { name: /^100$/ })).toHaveCount(0);

    const next = byTestId(page, tid.employeesPaginationNext);
    if (!(await next.isDisabled())) {
      await next.click();
    }
    const limitReq = page.waitForRequest((r) => {
      if (!r.url().includes("/employees") || r.method() !== "GET") return false;
      const u = new URL(r.url());
      return (
        u.searchParams.get("limit") === "10" &&
        u.searchParams.get("page") === "1"
      );
    });
    await openSelectOrCombobox(page, tid.employeesPaginationPageSize);
    await page.getByRole("option", { name: /^10$/ }).click();
    await limitReq;
    await expect(byTestId(page, tid.employeesPagination)).toContainText(
      /1\s*[–-]|\b1[–-]|из|of/i,
    );

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const entriesPageSize = byTestId(page, tid.entriesPaginationPageSize);
    await expect(entriesPageSize).toBeVisible({ timeout: 15_000 });
    await entriesPageSize.click();
    for (const n of ["10", "20", "50"]) {
      await expect(
        page.getByRole("option", { name: new RegExp(`^${n}$`) }),
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");

    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);
    const profilePageSize = byTestId(
      page,
      tid.employeeProfilePaginationPageSize,
    );
    await expect(profilePageSize).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("AC-3 · profile charts tooltips (#87)", () => {
  test("compact chart: no dense rotated axis labels; tooltip on hover", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);

    const chart = byTestId(page, tid.employeeProfileChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await byTestId(page, tid.employeeProfileChartOverTimeDay).click();

    const empty = byTestId(page, tid.employeeProfileChartEmpty);
    if (await empty.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: "note",
        description:
          "Empty chart — tooltip interaction skipped; empty state preserved",
      });
      await expect(empty).toBeVisible();
      return;
    }

    const rotated = chart.locator('text[transform*="rotate"]');
    await expect(rotated).toHaveCount(0);

    const segment = chart.locator("[data-segment]").first();
    await expect(segment).toBeVisible();
    const label = await segment.getAttribute("data-segment-label");
    expect(label).toBeTruthy();

    await segment.hover();
    const tip = byTestId(page, tid.chartTooltip);
    await expect(tip).toBeVisible({ timeout: 10_000 });
    await expect(tip).toContainText(label!);
    await expect(tip).toContainText(/\d/);

    await segment.focus();
    await expect(tip).toBeVisible();
  });
});

test.describe("AC-4 · entries employee filter Combobox (#88)", () => {
  test("filter is typeahead: input filters options; clear / noResults", async ({
    openApp: page,
  }) => {
    const unique = `QA ComboFilter ${Date.now()}`;
    await createEmployeeUi(page, unique);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const root = byTestId(page, tid.entriesFilterEmployee);
    await expect(root).toBeVisible();

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await expect(input).toBeVisible({ timeout: 10_000 });

    const needle = unique.slice(0, 12);
    await input.fill(needle);

    const list = byTestId(page, tid.entriesFilterEmployeeList);
    await expect(list).toBeVisible({ timeout: 10_000 });
    await expect(list.getByRole("option", { name: unique })).toBeVisible();
    await list.getByRole("option", { name: unique }).click();

    const apply = byTestId(page, tid.entriesFilterApply);
    if (await apply.count()) {
      await apply.click();
    }

    const clear = byTestId(page, tid.entriesFilterEmployeeClear);
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
    } else {
      // #112: no «Все сотрудники» option — clear via empty input / Escape
      await input.click();
      await input.fill("");
      await page.keyboard.press("Escape");
    }
    if (await apply.count()) {
      await apply.click();
    }

    await input.fill("___no_such_employee_zzz___");
    await expect(list).toBeVisible();
    await expect(list).toContainText(
      /не найден|no employees found|no results/i,
    );
  });
});

test.describe("AC-5 · create time entry employee Combobox (#89)", () => {
  test("create dialog Combobox; Escape keeps value; required validation", async ({
    openApp: page,
  }) => {
    const name = `QA EntryEmp ${Date.now()}`;
    await createEmployeeUi(page, name);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    await byTestId(page, tid.entriesAddOpen).click();

    const createEmp = byTestId(page, tid.entriesCreateEmployee);
    await expect(createEmp).toBeVisible({ timeout: 10_000 });
    const input = byTestId(page, tid.entriesCreateEmployeeInput);
    await expect(input).toBeVisible();

    await input.fill(name.slice(0, 10));
    const list = byTestId(page, tid.entriesCreateEmployeeList);
    await expect(list).toBeVisible();
    await list.getByRole("option", { name }).click();
    await expect(createEmp).toContainText(name);

    await input.click();
    await input.fill("partial-typo-should-not-stick");
    await page.keyboard.press("Escape");
    await expect(createEmp).toContainText(name);
    await expect(createEmp).not.toContainText("partial-typo-should-not-stick");

    // Close and reopen for required-validation check
    await page.keyboard.press("Escape");
    await byTestId(page, tid.entriesAddOpen).click();
    await expect(byTestId(page, tid.entriesCreateEmployee)).toBeVisible();
    await page.getByRole("button", { name: /сохранить|save/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("alert")).toContainText(
      /сотрудник|employee|обязател|required/i,
    );
  });
});

test.describe("AC-6 · report charts tooltips (#90)", () => {
  test("report compact chart + breakdown use chart-tooltip", async ({
    openApp: page,
  }) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(
      page,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );
    await gotoReport(page);

    const chart = byTestId(page, tid.reportChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await byTestId(page, tid.reportChartOverTimeDay).click();

    const empty = byTestId(page, tid.reportChartEmpty);
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }

    await expect(chart.locator('text[transform*="rotate"]')).toHaveCount(0);

    const segment = chart.locator("[data-segment]").first();
    await expect(segment).toBeVisible();
    const label = await segment.getAttribute("data-segment-label");
    expect(label).toBeTruthy();
    await segment.hover();
    const tip = byTestId(page, tid.chartTooltip);
    await expect(tip).toBeVisible({ timeout: 10_000 });
    await expect(tip).toContainText(label!);
    await expect(tip).toContainText(/\d/);

    const breakdown = byTestId(page, tid.reportChartBreakdown);
    await expect(breakdown).toBeVisible();
    const slice = breakdown.locator("svg [data-segment]").first();
    if (await slice.count()) {
      await slice.hover();
      await expect(byTestId(page, tid.chartTooltip)).toBeVisible();
    }
  });
});

test.describe("smoke · non-regression chrome still mounts", () => {
  test("nav + pagination roots + filter control still present", async ({
    openApp: page,
  }) => {
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.employeesPagination)).toBeVisible();
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    await expect(byTestId(page, tid.entriesFilterEmployee)).toBeVisible();
    await expect(byTestId(page, tid.entriesPagination)).toBeVisible();
  });
});

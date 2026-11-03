import { test, expect, tid, byTestId, gotoEntries, gotoReport, gotoEmployees } from "../fixtures";

/**
 * time-tracking-ui AC-1, AC-2, AC-3
 * Persistent nav + client routes + coherent app chrome smoke.
 */
test.describe("AC-1 / AC-2 / AC-3 · nav routes and app shell", () => {
  test("shows persistent nav with three sections and active state (AC-1)", async ({
    openApp: page,
  }) => {
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toBeVisible();
    await expect(byTestId(page, tid.navReport)).toBeVisible();

    // Active section visually / a11y distinct on Employees landing
    await expect(byTestId(page, tid.navEmployees)).toHaveAttribute(
      "aria-current",
      "page",
    );

    await gotoEntries(page);
    await expect(byTestId(page, tid.navEntries)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(byTestId(page, tid.navEmployees)).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await gotoReport(page);
    await expect(byTestId(page, tid.navReport)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("sections use client routes with URL reflection (AC-2)", async ({
    openApp: page,
  }) => {
    await expect(page).toHaveURL(/\/employees\/?$/);

    await gotoEntries(page);
    await expect(page).toHaveURL(/\/entries\/?$/);
    await expect(
      page.getByRole("heading", { name: /записи времени|time entries/i }),
    ).toBeVisible();

    await gotoReport(page);
    await expect(page).toHaveURL(/\/report\/?$/);
    await expect(byTestId(page, tid.reportFrom)).toBeVisible();

    await gotoEmployees(page);
    await expect(page).toHaveURL(/\/employees\/?$/);
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible();

    // Deep-link works
    await page.goto("/entries");
    await expect(page).toHaveURL(/\/entries\/?$/);
    await expect(byTestId(page, tid.entriesViewList)).toBeVisible();
  });

  test("chrome + section heading read as one app, not three stacked CRUD dumps (AC-3)", async ({
    openApp: page,
  }) => {
    // Shell chrome present
    await expect(byTestId(page, tid.themeToggle)).toBeVisible();
    await expect(byTestId(page, tid.localeSwitcher)).toBeVisible();
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();

    // One primary section h1 on Employees — report/entries blocks not all stacked on /
    await expect(
      page.getByRole("heading", { name: /сотрудники|employees/i }),
    ).toBeVisible();
    await expect(byTestId(page, tid.reportFrom)).toHaveCount(0);
    await expect(byTestId(page, tid.entriesList)).toHaveCount(0);
  });
});

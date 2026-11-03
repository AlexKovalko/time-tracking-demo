import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * data-testid map from docs/specs/time-tracking-calendar/ux.md
 * (+ aliases for time-tracking-ui baseline ids).
 * AC tickets: #32–#63.
 */
export const tid = {
  // Chrome / nav (AC-18)
  navEmployees: "nav-employees",
  navEntries: "nav-entries",
  navReport: "nav-report",
  themeToggle: "theme-toggle",
  localeSwitcher: "locale-switcher",
  localeRu: "locale-ru",
  localeEn: "locale-en",

  // Employees (AC-13, AC-21, AC-23)
  employeesAddOpen: "employees-add-open",
  employeesCreateDialog: "employees-create-dialog",
  employeesEditDialog: "employees-edit-dialog",
  employeesNameInput: "employees-name-input",
  employeesAddButton: "employees-add-button",
  employeesList: "employees-list",
  employeesPagination: "employees-pagination",
  employeesTabPeople: "employees-tab-people",
  employeesTabDepartments: "employees-tab-departments",
  employeeDepartmentSelect: "employee-department-select",
  employeeTitleInput: "employee-title-input",
  employeeEmailInput: "employee-email-input",
  employeePhoneInput: "employee-phone-input",
  employeeRowSecondary: "employee-row-secondary",

  // Departments (AC-20)
  departmentsList: "departments-list",
  departmentsAddOpen: "departments-add-open",
  departmentsNameInput: "departments-name-input",
  departmentsAddButton: "departments-add-button",

  // Employee profile (AC-24…26)
  employeeProfile: "employee-profile",
  employeeProfileBack: "employee-profile-back",
  employeeProfileName: "employee-profile-name",
  employeeProfileStats: "employee-profile-stats",
  employeeProfileFilterFrom: "employee-profile-filter-from",
  employeeProfileFilterTo: "employee-profile-filter-to",
  employeeProfileFilterQ: "employee-profile-filter-q",
  employeeProfileEntries: "employee-profile-entries",
  employeeProfileEmpty: "employee-profile-empty",

  // FAB timer (AC-1…AC-4) — canonical; launcher/collapsed = aliases
  timerFab: "timer-fab",
  timerFabBadge: "timer-fab-badge",
  timerPanel: "timer-panel",
  timerLauncher: "timer-launcher",
  timerEmployeeSelect: "timer-employee-select",
  timerDescriptionInput: "timer-description-input",
  timerStartButton: "timer-start-button",
  timerStopButton: "timer-stop-button",
  timerElapsed: "timer-elapsed",
  timerHideButton: "timer-hide-button",
  timerRestoreButton: "timer-restore-button",
  timerCollapsed: "timer-collapsed",
  timerAlreadyRunningError: "timer-already-running-error",
  timerHideConfirm: "timer-hide-confirm",
  timerHideConfirmEnd: "timer-hide-confirm-end",
  timerHideConfirmHide: "timer-hide-confirm-hide",

  // Time entries Calendar ∥ List (AC-5…AC-12)
  entriesViewList: "entries-view-list",
  entriesViewCalendar: "entries-view-calendar",
  entriesModeWeek: "entries-mode-week",
  entriesModeDay: "entries-mode-day",
  entriesPeriodPrev: "entries-period-prev",
  entriesPeriodNext: "entries-period-next",
  entriesPeriodToday: "entries-period-today",
  // Aliases from prior week-only chrome
  entriesWeekPrev: "entries-week-prev",
  entriesWeekNext: "entries-week-next",
  entriesWeekCurrent: "entries-week-current",
  entriesPeriodLabel: "entries-period-label",
  entriesList: "entries-list",
  entriesCalendar: "entries-calendar",
  entriesEmpty: "entries-empty",
  entriesAddOpen: "entries-add-open",
  entriesFilterEmployee: "entries-filter-employee",
  entriesFilterFrom: "entries-filter-from",
  entriesFilterTo: "entries-filter-to",
  entriesFilterQ: "entries-filter-q",
  entriesFilterApply: "entries-filter-apply",
  entriesFilterClear: "entries-filter-clear",
  entriesPagination: "entries-pagination",

  // Report + charts (AC-16, AC-27…29)
  reportFrom: "report-from",
  reportTo: "report-to",
  reportEntries: "report-entries",
  reportTotals: "report-totals",
  reportEmpty: "report-empty",
  reportExportButton: "report-export-button",
  reportChartOverTime: "report-chart-over-time",
  reportChartOverTimeDay: "report-chart-over-time-day",
  reportChartOverTimeWeek: "report-chart-over-time-week",
  reportChartBreakdown: "report-chart-breakdown",
  reportChartBreakdownEmployees: "report-chart-breakdown-employees",
  reportChartBreakdownDepartments: "report-chart-breakdown-departments",
  reportChartEmpty: "report-chart-empty",
} as const;

export const UUID_LABEL_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function byTestId(page: Page, id: string): Locator {
  return page.getByTestId(id);
}

type Fixtures = {
  /** Open SPA at / → /employees; chrome + FAB timer reachable. */
  openApp: Page;
};

export const test = base.extend<Fixtures>({
  openApp: async ({ page }, use) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/\/employees\/?$/, { timeout: 20_000 });
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toBeVisible();
    await expect(byTestId(page, tid.navReport)).toBeVisible();
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible();
    await expect(timerChromeRoot(page)).toBeVisible({ timeout: 20_000 });
    await use(page);
  },
});

export { expect };

/** FAB, panel, or legacy launcher/collapsed — any timer chrome surface. */
export function timerChromeRoot(page: Page): Locator {
  return page
    .locator(
      [
        `[data-testid="${tid.timerFab}"]`,
        `[data-testid="${tid.timerPanel}"]`,
        `[data-testid="${tid.timerLauncher}"]`,
        `[data-testid="${tid.timerCollapsed}"]`,
        `[data-testid="${tid.timerStartButton}"]`,
      ].join(", "),
    )
    .first();
}

/** @deprecated alias — prefer timerChromeRoot (FAB era). */
export function stickyTimerRoot(page: Page): Locator {
  return timerChromeRoot(page);
}

export async function gotoEmployees(page: Page): Promise<void> {
  await byTestId(page, tid.navEmployees).click();
  await expect(page).toHaveURL(/\/employees\/?$/);
}

export async function gotoEntries(page: Page): Promise<void> {
  await byTestId(page, tid.navEntries).click();
  await expect(page).toHaveURL(/\/entries\/?$/);
}

export async function gotoReport(page: Page): Promise<void> {
  await byTestId(page, tid.navReport).click();
  await expect(page).toHaveURL(/\/report\/?$/);
}

/** Open FAB panel so Start / running controls are visible (AC-2). */
export async function ensureTimerExpanded(page: Page): Promise<void> {
  if (await byTestId(page, tid.timerStartButton).isVisible().catch(() => false)) {
    return;
  }
  if (await byTestId(page, tid.timerStopButton).isVisible().catch(() => false)) {
    return;
  }
  const fab = byTestId(page, tid.timerFab);
  if (await fab.isVisible().catch(() => false)) {
    await fab.click();
  } else {
    const launcher = byTestId(page, tid.timerLauncher);
    if (await launcher.isVisible().catch(() => false)) {
      await launcher.click();
    }
    const restore = byTestId(page, tid.timerRestoreButton);
    if (await restore.isVisible().catch(() => false)) {
      await restore.click();
    }
  }
  await expect(
    page.locator(
      `[data-testid="${tid.timerStartButton}"], [data-testid="${tid.timerStopButton}"]`,
    ).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Prefer period-* testids; fall back to week-* aliases. */
export async function clickPeriodPrev(page: Page): Promise<void> {
  const modern = byTestId(page, tid.entriesPeriodPrev);
  if (await modern.count()) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekPrev).click();
}

export async function clickPeriodNext(page: Page): Promise<void> {
  const modern = byTestId(page, tid.entriesPeriodNext);
  if (await modern.count()) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekNext).click();
}

export async function clickPeriodToday(page: Page): Promise<void> {
  const modern = byTestId(page, tid.entriesPeriodToday);
  if (await modern.count()) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekCurrent).click();
}

export async function createEmployeeUi(
  page: Page,
  name: string,
): Promise<void> {
  if (!(await byTestId(page, tid.employeesAddOpen).isVisible().catch(() => false))) {
    await gotoEmployees(page);
  }
  await byTestId(page, tid.employeesAddOpen).click();
  const dialog = byTestId(page, tid.employeesCreateDialog);
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await byTestId(page, tid.employeesNameInput).fill(name);
  await byTestId(page, tid.employeesAddButton).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  await expect(byTestId(page, tid.employeesList)).toContainText(name, {
    timeout: 15_000,
  });
}

export async function selectEmployeeForTimer(
  page: Page,
  name: string,
): Promise<void> {
  await ensureTimerExpanded(page);
  const select = byTestId(page, tid.timerEmployeeSelect);
  const tag = await select.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await select.selectOption({ label: name });
  } else {
    await select.click();
    await page.getByRole("option", { name, exact: true }).click();
  }
}

export async function startTimerUi(
  page: Page,
  employeeName: string,
  description: string,
): Promise<void> {
  await selectEmployeeForTimer(page, employeeName);
  await byTestId(page, tid.timerDescriptionInput).fill(description);
  await byTestId(page, tid.timerStartButton).click();
  await expect(byTestId(page, tid.timerElapsed)).toBeVisible({
    timeout: 15_000,
  });
}

export async function setReportPeriod(
  page: Page,
  from: string,
  to: string,
): Promise<void> {
  if (!/\/report\/?$/.test(page.url())) {
    await gotoReport(page);
  }
  await byTestId(page, tid.reportFrom).fill(from);
  await byTestId(page, tid.reportTo).fill(to);
  const apply = page.getByRole("button", { name: /показать|show|apply|применить/i });
  if (await apply.count()) {
    await apply.click();
  }
}

/** Collect option labels from a native <select> or listbox trigger. */
export async function collectSelectLabels(
  page: Page,
  selectTestId: string,
): Promise<string[]> {
  const select = byTestId(page, selectTestId);
  await expect(select).toBeVisible({ timeout: 10_000 });
  const tag = await select.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    return select.locator("option").allTextContents();
  }
  await select.click();
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible({ timeout: 5_000 });
  const labels = await options.allTextContents();
  await page.keyboard.press("Escape");
  return labels;
}

export function assertNoUuidLabels(labels: string[]): void {
  const trimmed = labels.map((l) => l.trim()).filter(Boolean);
  for (const label of trimmed) {
    // Allow "All employees" / empty placeholder — reject pure UUID labels
    if (UUID_LABEL_RE.test(label)) {
      throw new Error(`UUID used as select label: ${label}`);
    }
  }
}

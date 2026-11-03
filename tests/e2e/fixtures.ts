import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * data-testid map from docs/specs/time-tracking-ui/ux.md §12
 * (+ baseline timer/report ids still valid).
 */
export const tid = {
  // Chrome / nav (AC-1, AC-2, AC-15)
  navEmployees: "nav-employees",
  navEntries: "nav-entries",
  navReport: "nav-report",
  themeToggle: "theme-toggle",
  localeSwitcher: "locale-switcher",
  localeRu: "locale-ru",
  localeEn: "locale-en",

  // Employees (AC-4, AC-5)
  employeesAddOpen: "employees-add-open",
  employeesCreateDialog: "employees-create-dialog",
  employeesEditDialog: "employees-edit-dialog",
  employeesNameInput: "employees-name-input",
  employeesAddButton: "employees-add-button",
  employeesList: "employees-list",

  // Sticky timer (AC-6, AC-7, AC-8)
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

  // Time entries Calendar ∥ List (AC-9…AC-13)
  entriesViewList: "entries-view-list",
  entriesViewCalendar: "entries-view-calendar",
  entriesWeekPrev: "entries-week-prev",
  entriesWeekNext: "entries-week-next",
  entriesWeekCurrent: "entries-week-current",
  entriesPeriodLabel: "entries-period-label",
  entriesList: "entries-list",
  entriesCalendar: "entries-calendar",
  entriesEmpty: "entries-empty",
  entriesAddOpen: "entries-add-open",

  // Report (AC-14)
  reportFrom: "report-from",
  reportTo: "report-to",
  reportEntries: "report-entries",
  reportTotals: "report-totals",
  reportEmpty: "report-empty",
  reportExportButton: "report-export-button",
} as const;

export function byTestId(page: Page, id: string): Locator {
  return page.getByTestId(id);
}

type Fixtures = {
  /** Open SPA at / → /employees; chrome + sticky timer reachable (time-tracking-ui IA). */
  openApp: Page;
};

export const test = base.extend<Fixtures>({
  openApp: async ({ page }, use) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Landing redirects to Employees (AC-2)
    await expect(page).toHaveURL(/\/employees\/?$/, { timeout: 20_000 });
    // Persistent nav (AC-1)
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toBeVisible();
    await expect(byTestId(page, tid.navReport)).toBeVisible();
    // Employees create opens via modal trigger — not an inline strip (AC-4)
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible();
    // Sticky timer chrome available without scrolling to mid-page block (AC-6)
    await expect(stickyTimerRoot(page)).toBeVisible({ timeout: 20_000 });
    await use(page);
  },
});

export { expect };

/** Expanded panel, collapsed chip, or idle launcher — any sticky timer surface. */
export function stickyTimerRoot(page: Page): Locator {
  return page
    .locator(
      `[data-testid="${tid.timerPanel}"], [data-testid="${tid.timerCollapsed}"], [data-testid="${tid.timerLauncher}"], [data-testid="${tid.timerStartButton}"]`,
    )
    .first();
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

/** Ensure Start form controls are visible (expand launcher / restore if needed). */
export async function ensureTimerExpanded(page: Page): Promise<void> {
  if (await byTestId(page, tid.timerStartButton).isVisible().catch(() => false)) {
    return;
  }
  const launcher = byTestId(page, tid.timerLauncher);
  if (await launcher.isVisible().catch(() => false)) {
    await launcher.click();
  }
  const restore = byTestId(page, tid.timerRestoreButton);
  if (await restore.isVisible().catch(() => false)) {
    await restore.click();
  }
  await expect(byTestId(page, tid.timerStartButton)).toBeVisible({
    timeout: 10_000,
  });
}

export async function createEmployeeUi(
  page: Page,
  name: string,
): Promise<void> {
  // Create only via Dialog (AC-4) — never rely on inline strip
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
  const apply = page.getByRole("button", { name: /показать|show/i });
  if (await apply.count()) {
    await apply.click();
  }
}

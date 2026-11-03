import {
  test as base,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { API_BASE_URL } from "../helpers/env";

/**
 * data-testid map from docs/specs/time-tracking-calendar/ux.md
 * (+ aliases for time-tracking-ui baseline ids).
 * AC tickets: #32–#63 (baseline); #67–#79 (AC-33…45).
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
  employeesPaginationPrev: "employees-pagination-prev",
  employeesPaginationNext: "employees-pagination-next",
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
  // Profile charts + labeled info (AC-33…36, AC-43)
  employeeProfileChartOverTime: "employee-profile-chart-over-time",
  employeeProfileChartOverTimeDay: "employee-profile-chart-over-time-day",
  employeeProfileChartOverTimeWeek: "employee-profile-chart-over-time-week",
  employeeProfileChartDescription: "employee-profile-chart-description",
  employeeProfileChartEmpty: "employee-profile-chart-empty",
  employeeProfileInfo: "employee-profile-info",
  employeeProfileInfoTitle: "employee-profile-info-title",
  employeeProfileInfoDepartment: "employee-profile-info-department",
  employeeProfileInfoEmail: "employee-profile-info-email",
  employeeProfileInfoPhone: "employee-profile-info-phone",

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
  reportApply: "report-apply",
  reportEntries: "report-entries",
  reportTotals: "report-totals",
  reportEmpty: "report-empty",
  reportExportButton: "report-export-button",
  entriesEditSave: "entries-edit-save",
  entriesEditDelete: "entries-edit-delete",
  reportChartOverTime: "report-chart-over-time",
  reportChartOverTimeDay: "report-chart-over-time-day",
  reportChartOverTimeWeek: "report-chart-over-time-week",
  reportChartBreakdown: "report-chart-breakdown",
  reportChartBreakdownEmployees: "report-chart-breakdown-employees",
  reportChartBreakdownDepartments: "report-chart-breakdown-departments",
  reportChartEmpty: "report-chart-empty",

  // Delete entry confirm (AC-42)
  entriesDeleteConfirm: "entries-delete-confirm",
  entriesDeleteDialog: "entries-delete-dialog",
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

/** Stop any leftover running timers so elapsed chrome does not leak across tests. */
export async function clearActiveTimers(
  request: APIRequestContext,
): Promise<void> {
  try {
    const res = await request.get(`${API_BASE_URL}/timers/active`);
    if (!res.ok()) return;
    const active = (await res.json()) as Array<{ employeeId: string }>;
    if (!Array.isArray(active)) return;
    for (const timer of active) {
      await request.post(`${API_BASE_URL}/timers/stop`, {
        data: { employeeId: timer.employeeId },
      });
    }
  } catch {
    /* API may be briefly unavailable; tests will surface failures themselves */
  }
}

export const test = base.extend<Fixtures>({
  openApp: async ({ page, request }, use) => {
    await clearActiveTimers(request);
    // Retry once if nginx briefly restarts mid-suite
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await page.waitForTimeout(1500);
      }
    }
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/\/employees\/?$/, { timeout: 20_000 });
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toBeVisible();
    await expect(byTestId(page, tid.navReport)).toBeVisible();
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible();
    await expect(timerChromeRoot(page)).toBeVisible({ timeout: 20_000 });
    await use(page);
    await clearActiveTimers(request);
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
  if (await modern.isVisible().catch(() => false)) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekPrev).click({ force: true });
}

export async function clickPeriodNext(page: Page): Promise<void> {
  const modern = byTestId(page, tid.entriesPeriodNext);
  if (await modern.isVisible().catch(() => false)) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekNext).click({ force: true });
}

export async function clickPeriodToday(page: Page): Promise<void> {
  const modern = byTestId(page, tid.entriesPeriodToday);
  if (await modern.isVisible().catch(() => false)) {
    await modern.click();
    return;
  }
  await byTestId(page, tid.entriesWeekCurrent).click({ force: true });
}

/** Stop running timer and wait until elapsed chrome is gone (avoids race with query invalidation). */
export async function stopTimerUi(page: Page): Promise<void> {
  await ensureTimerExpanded(page);
  const stop = byTestId(page, tid.timerStopButton);
  await expect(stop).toBeVisible({ timeout: 10_000 });
  await stop.click();
  await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(byTestId(page, tid.timerFabBadge)).toHaveCount(0, {
    timeout: 5_000,
  });
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
  const createResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/employees") &&
      r.request().method() === "POST" &&
      !r.url().includes("/stats"),
    { timeout: 15_000 },
  );
  await byTestId(page, tid.employeesAddButton).click();
  const res = await createResponse;
  if (!res.ok()) {
    throw new Error(`POST /employees failed: ${res.status()} ${await res.text()}`);
  }
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });

  // Ensure people tab + fresh list (FE may still be on Departments or a stale page).
  await gotoEmployees(page);
  const peopleTab = byTestId(page, tid.employeesTabPeople);
  if (await peopleTab.isVisible().catch(() => false)) {
    await peopleTab.click();
  }
  const list = byTestId(page, tid.employeesList);
  const findOnPages = async (): Promise<boolean> => {
    if ((await list.innerText()).includes(name)) return true;
    const pagination = byTestId(page, tid.employeesPagination);
    if ((await pagination.count()) === 0) return false;
    for (let i = 0; i < 40; i += 1) {
      const prev = byTestId(page, tid.employeesPaginationPrev);
      if ((await prev.count()) === 0 || (await prev.isDisabled().catch(() => true))) {
        break;
      }
      await prev.click();
    }
    for (let i = 0; i < 40; i += 1) {
      if ((await list.innerText()).includes(name)) return true;
      const next = byTestId(page, tid.employeesPaginationNext);
      if ((await next.count()) === 0 || (await next.isDisabled().catch(() => true))) {
        break;
      }
      await next.click();
    }
    return (await list.innerText()).includes(name);
  };
  await expect.poll(findOnPages, { timeout: 30_000, intervals: [400, 800, 1200] }).toBe(true);
  await expect(list).toContainText(name, { timeout: 5_000 });
}

export async function selectEmployeeForTimer(
  page: Page,
  name: string,
): Promise<void> {
  await ensureTimerExpanded(page);
  const select = byTestId(page, tid.timerEmployeeSelect);
  await expect(select).toBeEnabled({ timeout: 15_000 });
  const tag = await select.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await expect
      .poll(async () => {
        const labels = await select.locator("option").allTextContents();
        return labels.some((l) => l.trim() === name);
      }, { timeout: 15_000 })
      .toBe(true);
    await select.selectOption({ label: name });
  } else {
    await select.click();
    const option = page.getByRole("option", { name, exact: true });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
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
  const applyById = byTestId(page, tid.reportApply);
  if (await applyById.count()) {
    await applyById.click();
    return;
  }
  const apply = page.getByRole("button", {
    name: /показать|show|apply|применить/i,
  });
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

/** Open profile for a seeded Cyrillic FIO employee (paginates if needed). */
export async function openSeedEmployeeProfile(page: Page): Promise<void> {
  await gotoEmployees(page);
  const peopleTab = byTestId(page, tid.employeesTabPeople);
  if (await peopleTab.count()) {
    await peopleTab.click();
  }
  const list = byTestId(page, tid.employeesList);
  await expect(list).toBeVisible();
  for (let i = 0; i < 25; i += 1) {
    // Match Cyrillic in employee-name only — secondary "Без подразделения" is also Cyrillic.
    const seedName = list.getByTestId("employee-name").filter({
      hasText: /[А-ЯЁа-яё]{3,}/,
    });
    if ((await seedName.count()) > 0) {
      await seedName.first().click();
      await expect(byTestId(page, tid.employeeProfile)).toBeVisible({
        timeout: 15_000,
      });
      return;
    }
    const next = byTestId(page, tid.employeesPaginationNext);
    if ((await next.count()) === 0 || (await next.isDisabled())) break;
    await next.click();
    await expect(list).toBeVisible();
  }
  const fallback = page.getByRole("link", { name: /^(профиль|profile)$/i });
  await fallback.first().click();
  await expect(byTestId(page, tid.employeeProfile)).toBeVisible({
    timeout: 15_000,
  });
}

export async function applyProfilePeriod(
  page: Page,
  fromIso?: string,
  toIso?: string,
): Promise<void> {
  const to = toIso ?? new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 28);
  const from = fromIso ?? fromDate.toISOString().slice(0, 10);
  await byTestId(page, tid.employeeProfileFilterFrom).fill(from);
  await byTestId(page, tid.employeeProfileFilterTo).fill(to);
  const apply = page.getByRole("button", {
    name: /применить|apply|показать|show/i,
  });
  if (await apply.count()) {
    await apply.click();
  }
}


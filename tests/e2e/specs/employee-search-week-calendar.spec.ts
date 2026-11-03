import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  gotoEntries,
  ensureTimerExpanded,
  clickPeriodToday,
} from "../fixtures";
import type { Page, Request } from "@playwright/test";

/**
 * employee-search-week-calendar · AC-2…AC-8 (#95–#101)
 * Expected RED until frontend-dev lands async Combobox + week resource matrix.
 * AC-1 covered by tests/api/employees-search.spec.ts.
 */

function isEmployeesListGet(req: Request): boolean {
  if (req.method() !== "GET") return false;
  const url = req.url();
  if (!/\/api\/employees(\?|$)/.test(url)) return false;
  // Exclude /employees/:id and /stats
  const path = new URL(url).pathname.replace(/\/$/, "");
  const tail = path.split("/").pop() ?? "";
  if (tail !== "employees") return false;
  return true;
}

async function openEntriesFilterCombobox(page: Page): Promise<void> {
  await gotoEntries(page);
  await byTestId(page, tid.entriesViewList).click();
  const trigger = byTestId(page, tid.entriesFilterEmployee);
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  const input = byTestId(page, tid.entriesFilterEmployeeInput);
  if (await input.isVisible().catch(() => false)) {
    await input.click();
  } else {
    await trigger.click();
  }
  await expect(byTestId(page, tid.entriesFilterEmployeeList)).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("AC-2 · EmployeeCombobox debounced server search (#95)", () => {
  test("entries filter types q → GET /employees includes q (not listAll crawl)", async ({
    openApp: page,
  }) => {
    const name = `QA Srch ${Date.now()}`;
    await createEmployeeUi(page, name);
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const employeeGets: string[] = [];
    page.on("request", (req) => {
      if (isEmployeesListGet(req)) employeeGets.push(req.url());
    });

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.click();
    await input.fill("");
    const needle = name.slice(0, 8);
    const waitQ = page.waitForRequest(
      (req) => {
        if (!isEmployeesListGet(req)) return false;
        const u = new URL(req.url());
        const q = u.searchParams.get("q") ?? "";
        return q.toLowerCase().includes(needle.toLowerCase().slice(0, 4));
      },
      { timeout: 15_000 },
    );
    await input.type(needle, { delay: 40 });
    const req = await waitQ;
    const u = new URL(req.url());
    expect(u.searchParams.get("q")?.length).toBeGreaterThan(0);
    expect(Number(u.searchParams.get("page") ?? "1")).toBe(1);

    // After debounce search, must not keep crawling many unfiltered pages as primary path
    await page.waitForTimeout(800);
    const unfilteredMultiPage = employeeGets.filter((url) => {
      const p = new URL(url);
      const q = p.searchParams.get("q");
      const pageNo = Number(p.searchParams.get("page") ?? "1");
      return (!q || q === "") && pageNo >= 3;
    });
    expect(unfilteredMultiPage.length).toBe(0);
  });

  test("Timer Combobox uses server q search (AC-2)", async ({ openApp: page }) => {
    const name = `QA Tmr ${Date.now()}`;
    await createEmployeeUi(page, name);
    await ensureTimerExpanded(page);
    const select = byTestId(page, tid.timerEmployeeSelect);
    await expect(select).toBeVisible({ timeout: 15_000 });
    await select.click();
    const input =
      (await byTestId(page, "timer-employee-select-input").count()) > 0
        ? byTestId(page, "timer-employee-select-input")
        : select.locator('input[role="combobox"], input').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    const waitQ = page.waitForRequest(
      (req) => {
        if (!isEmployeesListGet(req)) return false;
        const q = new URL(req.url()).searchParams.get("q") ?? "";
        return q.length > 0;
      },
      { timeout: 15_000 },
    );
    await input.fill(name.slice(0, 6));
    await waitQ;
  });

  test("empty q on open browses page 1 (AC-2)", async ({ openApp: page }) => {
    await openEntriesFilterCombobox(page);
    const waitBrowse = page.waitForRequest(
      (req) => {
        if (!isEmployeesListGet(req)) return false;
        const u = new URL(req.url());
        const q = u.searchParams.get("q");
        const pageNo = Number(u.searchParams.get("page") ?? "0");
        return (q == null || q === "") && pageNo === 1;
      },
      { timeout: 10_000 },
    );
    // Re-open to force fetch if first open already happened
    await page.keyboard.press("Escape");
    await byTestId(page, tid.entriesFilterEmployeeInput).click();
    await waitBrowse;
  });
});

test.describe("AC-3 · Combobox lazy option pages (#96)", () => {
  test("scroll near end loads page+1 with same q and appends", async ({
    openApp: page,
  }) => {
    const prefix = `QALazy${Date.now()}`;
    const mkItems = (pageNo: number, limit: number) =>
      Array.from({ length: limit }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(pageNo * 100 + i).padStart(12, "0")}`,
        name: `${prefix} Emp ${pageNo}-${i}`,
      }));

    await page.route("**/api/employees?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      const u = new URL(route.request().url());
      const q = u.searchParams.get("q") ?? "";
      if (!q.includes("QALazy")) {
        await route.continue();
        return;
      }
      const pageNo = Number(u.searchParams.get("page") ?? "1");
      const limit = Number(u.searchParams.get("limit") ?? "10");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: mkItems(pageNo, limit),
          total: limit * 3,
          page: pageNo,
          limit,
        }),
      });
    });

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await input.click();

    const waitPage1 = page.waitForRequest(
      (req) => {
        if (!isEmployeesListGet(req)) return false;
        const u = new URL(req.url());
        return (
          (u.searchParams.get("q") ?? "").includes("QALazy") &&
          Number(u.searchParams.get("page") ?? "0") === 1
        );
      },
      { timeout: 15_000 },
    );
    await input.fill(prefix);
    await waitPage1;

    const list = byTestId(page, tid.entriesFilterEmployeeList);
    await expect(list).toBeVisible();
    const beforeCount = await list.getByRole("option").count();

    const waitPage2 = page.waitForRequest(
      (req) => {
        if (!isEmployeesListGet(req)) return false;
        const u = new URL(req.url());
        return (
          (u.searchParams.get("q") ?? "").includes("QALazy") &&
          Number(u.searchParams.get("page") ?? "0") === 2
        );
      },
      { timeout: 15_000 },
    );
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await waitPage2;

    await expect
      .poll(async () => list.getByRole("option").count(), {
        timeout: 10_000,
      })
      .toBeGreaterThan(beforeCount);
  });

  test("new q resets to page 1 (AC-3)", async ({ openApp: page }) => {
    await page.route("**/api/employees?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      const u = new URL(route.request().url());
      const q = u.searchParams.get("q") ?? "";
      if (!q.includes("ZZReset")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "00000000-0000-4000-8000-000000000001", name: q }],
          total: 1,
          page: Number(u.searchParams.get("page") ?? "1"),
          limit: 20,
        }),
      });
    });

    await openEntriesFilterCombobox(page);
    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    const pagesForQ: number[] = [];
    page.on("request", (req) => {
      if (!isEmployeesListGet(req)) return;
      const u = new URL(req.url());
      const q = u.searchParams.get("q") ?? "";
      if (q.includes("ZZReset")) {
        pagesForQ.push(Number(u.searchParams.get("page") ?? "1"));
      }
    });
    await input.fill("ZZResetA");
    await page.waitForTimeout(500);
    await input.fill("ZZResetB");
    await page.waitForTimeout(800);
    expect(pagesForQ.length).toBeGreaterThan(0);
    expect(pagesForQ.every((p) => p === 1)).toBe(true);
  });
});

test.describe("AC-4 · Selected employee stays visible (#97)", () => {
  test("selected label remains when current search page omits employee", async ({
    openApp: page,
  }) => {
    const name = `QA Keep ${Date.now()}`;
    await createEmployeeUi(page, name);
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await input.click();
    await input.fill(name);
    const option = page.getByRole("option", { name: new RegExp(name, "i") });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();

    // After selection, force options to a page without this employee via route
    await page.route("**/api/employees?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      const u = new URL(route.request().url());
      if (u.searchParams.get("q")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "00000000-0000-4000-8000-000000000099",
                name: "Unrelated Decoy Employee",
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          }),
        });
        return;
      }
      await route.continue();
    });

    await input.click();
    await input.fill("Unrelated");
    await page.waitForTimeout(600);

    // Selected employee must remain visible as a pinned option even when absent from search page
    const list = byTestId(page, tid.entriesFilterEmployeeList);
    await expect(list.getByRole("option", { name: new RegExp(name, "i") })).toBeVisible({
      timeout: 10_000,
    });

    await page.keyboard.press("Escape");
    const trigger = byTestId(page, tid.entriesFilterEmployee);
    await expect(trigger).toContainText(name, { timeout: 10_000 });

    const clear = byTestId(page, tid.entriesFilterEmployeeClear);
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
      await expect(trigger).toContainText(/все сотрудники|all employees/i);
    }
  });
});

test.describe("AC-5 · Week calendar FIO left column (#98)", () => {
  test("week mode: employee rows left, days top, no hour axis as sole Y", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeWeek).click();
    await clickPeriodToday(page);

    const calendar = byTestId(page, tid.entriesCalendar);
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    // Resource chrome (FE may use either testid)
    const resource = page.locator(
      `[data-testid="${tid.entriesWeekResource}"], [data-testid="${tid.entriesEmployeeRow}"], [data-testid^="entries-employee-row-"]`,
    );
    await expect(resource.first()).toBeVisible({ timeout: 15_000 });

    // Days still across the top
    await expect(
      calendar.locator("[data-day], [data-testid^='entries-day-']"),
    ).toHaveCount(7, { timeout: 10_000 });

    // Hour axis must NOT be the week Y-axis
    await expect(byTestId(page, "entries-hour-axis")).toHaveCount(0);
  });
});

test.describe("AC-6 · Week cells employee×day (#99)", () => {
  test("entries appear in employee×day cells with description/time", async ({
    openApp: page,
  }) => {
    const name = `QA Cell ${Date.now()}`;
    const description = `week-cell-${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(800);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0, {
      timeout: 15_000,
    });

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeWeek).click();
    await clickPeriodToday(page);

    // Resource employee×day cells (RED until week matrix lands)
    const cell = page.locator(
      `[data-testid="${tid.entriesWeekCell}"], [data-testid^="entries-week-cell-"], [data-testid^="entries-employee-day-"]`,
    );
    await expect(cell.first()).toBeVisible({ timeout: 15_000 });
    await expect(byTestId(page, tid.entriesCalendar)).toContainText(description, {
      timeout: 15_000,
    });
    // Chip should not rely on hour-axis positioning in week mode
    await expect(byTestId(page, "entries-hour-axis")).toHaveCount(0);
  });
});

test.describe("AC-7 · Week create / day non-regression (#100)", () => {
  test("week: empty cell click opens create with employee+date prefills", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeWeek).click();
    await clickPeriodToday(page);

    const cell = page.locator(
      `[data-testid="${tid.entriesWeekCell}"], [data-testid^="entries-week-cell-"], [data-testid^="entries-employee-day-"]`,
    );
    // If resource week not ready, this fails (RED) — correct for qa write
    await expect(cell.first()).toBeVisible({ timeout: 15_000 });
    await cell.first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Prefill: employee combobox and datetime fields present
    await expect(
      dialog.locator(
        `[data-testid="${tid.entriesCreateEmployee}"], [data-testid="${tid.entriesCreateEmployeeInput}"]`,
      ).first(),
    ).toBeVisible();
    const timeInputs = dialog.locator(
      'input[type="datetime-local"], input[type="time"], input[type="date"]',
    );
    await expect(timeInputs.first()).toBeVisible();
    const val = await timeInputs.first().inputValue();
    expect(val.length).toBeGreaterThan(0);
    await dialog.getByRole("button", { name: /отмена|cancel/i }).click();
  });

  test("day: hour axis + drag-create preserved (AC-7 non-regression)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeDay).click();
    await clickPeriodToday(page);

    await expect(byTestId(page, "entries-hour-axis")).toBeVisible({
      timeout: 15_000,
    });

    const day = page.locator("[data-testid^='entries-day-']").first();
    await expect(day).toBeVisible({ timeout: 15_000 });
    const box = await day.boundingBox();
    expect(box).toBeTruthy();
    const startX = box!.x + box!.width * 0.5;
    const startY = box!.y + 80;
    const endY = box!.y + 200;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 12 });
    await page.mouse.up();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button", { name: /отмена|cancel/i }).click();
  });

  test("list PaginationBar page sizes still available (AC-7 smoke, not #102 polish)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const pageSize = byTestId(page, tid.entriesPaginationPageSize);
    await expect(pageSize).toBeVisible({ timeout: 15_000 });
    await pageSize.click();
    for (const n of ["10", "20", "50"]) {
      await expect(
        page.getByRole("option", { name: new RegExp(`^${n}$`) }),
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");
  });
});

test.describe("AC-8 · Combobox loading / empty / no-results (#101)", () => {
  test("query with no matches shows no-results, not browse-empty", async ({
    openApp: page,
  }) => {
    await openEntriesFilterCombobox(page);
    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    const nonsense = `zzz-no-match-${Date.now()}`;
    await input.fill(nonsense);
    await page.waitForTimeout(700);

    const list = byTestId(page, tid.entriesFilterEmployeeList);
    await expect(list).toBeVisible();
    const noResults = page.locator(
      `[data-testid="${tid.entriesFilterEmployeeNoResults}"], [data-testid$="-no-results"]`,
    );
    if ((await noResults.count()) > 0) {
      await expect(noResults.first()).toBeVisible();
    } else {
      await expect(list).toContainText(/не найден|no employees found|no results/i);
    }
    await expect(list).not.toContainText(/нет сотрудников$|no employees yet/i);
  });

  test("loading state is distinguishable while fetching (AC-8)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/employees?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await gate;
      await route.continue();
    });

    const input = byTestId(page, tid.entriesFilterEmployeeInput);
    await input.click();
    await input.fill("LoadingProbe");
    const loading = page.locator(
      `[data-testid="${tid.entriesFilterEmployeeLoading}"], [data-testid$="-loading"]`,
    );
    await expect(loading.first()).toBeVisible({ timeout: 5_000 });
    release?.();
    await page.unroute("**/api/employees?**");
  });

  test("week empty state remains clear (AC-8)", async ({ openApp: page }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeWeek).click();
    for (let i = 0; i < 60; i += 1) {
      await byTestId(page, tid.entriesPeriodNext).click();
    }
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible({
      timeout: 15_000,
    });
    await expect(byTestId(page, tid.entriesEmpty)).toContainText(
      /нет записей|no entries/i,
    );
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  ensureTimerExpanded,
  gotoEntries,
  collectSelectLabels,
  assertNoUuidLabels,
} from "../fixtures";

/**
 * AC-41 (#75) — entries employee filter shows names; backend page/limit/employeeId/q.
 */
test.describe("AC-41 · entries filter names + backend paging (#75)", () => {
  test("employee filter labels are names, not UUID", async ({
    openApp: page,
  }) => {
    const name = `QA AC41 ${Date.now()}`;
    await createEmployeeUi(page, name);
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const labels = await collectSelectLabels(page, tid.entriesFilterEmployee);
    assertNoUuidLabels(labels);
    expect(labels.some((l) => l.includes(name))).toBe(true);
  });

  test("list Apply sends page/limit/employeeId/q/from/to to API", async ({
    openApp: page,
  }) => {
    const name = `QA AC41 Filter ${Date.now()}`;
    const description = `ac41-q-${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(700);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const today = new Date().toISOString().slice(0, 10);
    await byTestId(page, tid.entriesFilterFrom).fill(today);
    await byTestId(page, tid.entriesFilterTo).fill(today);
    await byTestId(page, tid.entriesFilterQ).fill(description);

    // Pick the employee in the filter select
    await byTestId(page, tid.entriesFilterEmployee).click();
    await page.getByRole("option", { name: new RegExp(name, "i") }).click();

    const reqPromise = page.waitForRequest(
      (req) => {
        if (req.method() !== "GET") return false;
        const url = req.url();
        if (!/\/api\/time-entries\?/.test(url)) return false;
        const u = new URL(url);
        return (
          u.searchParams.has("page") &&
          u.searchParams.has("limit") &&
          u.searchParams.has("employeeId") &&
          u.searchParams.has("q") &&
          u.searchParams.has("from") &&
          u.searchParams.has("to")
        );
      },
      { timeout: 20_000 },
    );

    await byTestId(page, tid.entriesFilterApply).click();
    const req = await reqPromise;
    const u = new URL(req.url());
    expect(u.searchParams.get("q")).toBe(description);
    expect(u.searchParams.get("from")).toBe(today);
    expect(u.searchParams.get("to")).toBe(today);
    expect(u.searchParams.get("employeeId")).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(Number(u.searchParams.get("page"))).toBeGreaterThanOrEqual(1);
    expect(Number(u.searchParams.get("limit"))).toBeGreaterThan(0);

    await expect(byTestId(page, tid.entriesList)).toContainText(description, {
      timeout: 15_000,
    });
  });
});

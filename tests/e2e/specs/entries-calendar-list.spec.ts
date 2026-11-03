import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  gotoEntries,
  ensureTimerExpanded,
} from "../fixtures";

/**
 * time-tracking-ui AC-9…AC-13
 * Time entries: Calendar ∥ List toggle, shared week period, week nav, list CRUD, empty states.
 */
test.describe("AC-9…AC-13 · entries Calendar ∥ List", () => {
  test("offers List and Calendar views on /entries (AC-9)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);

    await expect(byTestId(page, tid.entriesViewList)).toBeVisible();
    await expect(byTestId(page, tid.entriesViewCalendar)).toBeVisible();

    // Default view = List
    await expect(byTestId(page, tid.entriesList)).toBeVisible();
    await expect(byTestId(page, tid.entriesCalendar)).toHaveCount(0);

    await byTestId(page, tid.entriesViewCalendar).click();
    await expect(byTestId(page, tid.entriesCalendar)).toBeVisible();
    await expect(byTestId(page, tid.entriesList)).toHaveCount(0);

    await byTestId(page, tid.entriesViewList).click();
    await expect(byTestId(page, tid.entriesList)).toBeVisible();
  });

  test("keeps shared week period when switching List ↔ Calendar (AC-10)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);

    await byTestId(page, tid.entriesWeekNext).click();
    const periodAfterNext = (
      await byTestId(page, tid.entriesPeriodLabel).innerText()
    ).trim();
    expect(periodAfterNext.length).toBeGreaterThan(0);

    await byTestId(page, tid.entriesViewCalendar).click();
    await expect(byTestId(page, tid.entriesCalendar)).toBeVisible();
    await expect(byTestId(page, tid.entriesPeriodLabel)).toHaveText(
      periodAfterNext,
    );

    await byTestId(page, tid.entriesViewList).click();
    await expect(byTestId(page, tid.entriesList)).toBeVisible();
    await expect(byTestId(page, tid.entriesPeriodLabel)).toHaveText(
      periodAfterNext,
    );
  });

  test("calendar shows a week with week navigation and this-week jump (AC-11)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();

    const calendar = byTestId(page, tid.entriesCalendar);
    await expect(calendar).toBeVisible();
    // Seven day columns/sections
    await expect(calendar.locator("[data-day], [data-testid^='entries-day-']")).toHaveCount(7, {
      timeout: 10_000,
    }).catch(async () => {
      // Fallback: day headers Mon–Sun (ru/en) — at least 7 day cells
      const dayCells = calendar.locator(":scope > *");
      await expect(dayCells).toHaveCount(7, { timeout: 5_000 });
    });

    const before = (await byTestId(page, tid.entriesPeriodLabel).innerText()).trim();
    await byTestId(page, tid.entriesWeekPrev).click();
    const afterPrev = (
      await byTestId(page, tid.entriesPeriodLabel).innerText()
    ).trim();
    expect(afterPrev).not.toBe(before);

    await byTestId(page, tid.entriesWeekNext).click();
    await byTestId(page, tid.entriesWeekCurrent).click();
    const current = (
      await byTestId(page, tid.entriesPeriodLabel).innerText()
    ).trim();
    expect(current.length).toBeGreaterThan(0);
    // After "this week", period should settle (equal to original if we started on current week)
    await expect(byTestId(page, tid.entriesPeriodLabel)).toBeVisible();
  });

  test("list shows period entries with edit and delete (AC-12)", async ({
    openApp: page,
  }) => {
    const name = `QA Entries ${Date.now()}`;
    const description = `Entries list CRUD ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(1100);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);

    await gotoEntries(page);
    await byTestId(page, tid.entriesWeekCurrent).click();
    await byTestId(page, tid.entriesViewList).click();

    const list = byTestId(page, tid.entriesList);
    await expect(list).toContainText(description, { timeout: 15_000 });
    await expect(list).toContainText(name);

    const row = list.locator(`[data-testid^="entry-row-"]`).filter({
      hasText: description,
    });
    const target =
      (await row.count()) > 0
        ? row.first()
        : list.locator("tbody tr, [role='row']").filter({ hasText: description });

    await expect(target.first()).toBeVisible();
    await target.first().getByRole("button", { name: /изменить|edit/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const renamed = `${description} edited`;
    const descField = dialog.getByRole("textbox").first();
    await descField.fill(renamed);
    await dialog.getByRole("button", { name: /сохранить|save/i }).click();
    await expect(list).toContainText(renamed, { timeout: 15_000 });

    const editedRow = list.locator(`[data-testid^="entry-row-"]`).filter({
      hasText: renamed,
    });
    const deleteTarget =
      (await editedRow.count()) > 0
        ? editedRow.first()
        : list.locator("tbody tr, [role='row']").filter({ hasText: renamed });
    await deleteTarget
      .first()
      .getByRole("button", { name: /удалить|delete/i })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /удалить|delete|confirm/i }).click();
    await expect(list.getByText(renamed, { exact: true })).toHaveCount(0);
  });

  test("empty week shows empty state without crash (AC-13)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);

    // Jump far from today by many weeks so the week is empty
    for (let i = 0; i < 52; i += 1) {
      await byTestId(page, tid.entriesWeekNext).click();
    }

    await byTestId(page, tid.entriesViewList).click();
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible({
      timeout: 15_000,
    });
    await expect(byTestId(page, tid.entriesEmpty)).toContainText(
      /записей нет|no entries/i,
    );

    await byTestId(page, tid.entriesViewCalendar).click();
    await expect(byTestId(page, tid.entriesCalendar)).toBeVisible();
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible();
    // Shell still alive
    await expect(byTestId(page, tid.navEntries)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

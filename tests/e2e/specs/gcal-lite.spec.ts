import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  gotoEntries,
  clickPeriodPrev,
  clickPeriodNext,
  clickPeriodToday,
} from "../fixtures";

/**
 * AC-5…AC-10 (#36–#41) — GCal-lite calendar.
 * Expected RED until frontend ships Week|Day hour grid + drag-create.
 */
test.describe("AC-5…10 · GCal-lite (#36–#41)", () => {
  test("calendar fills main content width (AC-5 #36)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    const calendar = byTestId(page, tid.entriesCalendar);
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const calBox = await calendar.boundingBox();
    const main = page.locator("main").first();
    const mainBox =
      (await main.boundingBox().catch(() => null)) ??
      (await page.locator("[data-testid='app-main'], #root > div").first().boundingBox());
    expect(calBox).toBeTruthy();
    expect(mainBox).toBeTruthy();
    // Calendar should span most of the content zone (not a narrow card)
    expect(calBox!.width).toBeGreaterThan(mainBox!.width * 0.7);
  });

  test("Week | Day modes with prev / next / today (AC-6 #37)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();

    await expect(byTestId(page, tid.entriesModeWeek)).toBeVisible();
    await expect(byTestId(page, tid.entriesModeDay)).toBeVisible();

    await byTestId(page, tid.entriesModeWeek).click();
    const before = (await byTestId(page, tid.entriesPeriodLabel).innerText()).trim();
    await clickPeriodPrev(page);
    const afterPrev = (
      await byTestId(page, tid.entriesPeriodLabel).innerText()
    ).trim();
    expect(afterPrev).not.toBe(before);

    await clickPeriodNext(page);
    await byTestId(page, tid.entriesModeDay).click();
    await clickPeriodToday(page);
    await expect(byTestId(page, tid.entriesPeriodLabel)).toBeVisible();
    const label = (await byTestId(page, tid.entriesPeriodLabel).innerText()).trim();
    expect(label.length).toBeGreaterThan(0);
  });

  test("hour axis present; entries are positioned blocks (AC-7 #38)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeWeek).click();

    const calendar = byTestId(page, tid.entriesCalendar);
    await expect(calendar).toBeVisible();

    const hourAxis = byTestId(page, "entries-hour-axis");
    await expect(hourAxis).toBeVisible({ timeout: 15_000 });
    await expect(hourAxis).toContainText(/\d{1,2}:00/);

    // Seed densifies current week — blocks should appear after calendar range loads
    await expect(
      page.locator("[data-testid^='entries-calendar-block-']").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("drag-select empty grid prefills create dialog (AC-8 #39)", async ({
    openApp: page,
  }) => {
    const name = `QA Drag ${Date.now()}`;
    await createEmployeeUi(page, name);
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await byTestId(page, tid.entriesModeDay).click();
    await clickPeriodToday(page);

    const day = page.locator("[data-testid^='entries-day-']").first();
    await expect(day).toBeVisible({ timeout: 15_000 });
    const box = await day.boundingBox();
    expect(box).toBeTruthy();

    // Drag on the day column (pointer handlers live there, not on calendar chrome)
    const startX = box!.x + box!.width * 0.5;
    const startY = box!.y + 80;
    const endY = box!.y + 200;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 12 });
    await page.mouse.up();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Prefill: datetime fields present and non-empty
    const inputs = dialog.locator('input[type="datetime-local"], input[type="time"]');
    await expect(inputs.first()).toBeVisible();
    const val = await inputs.first().inputValue();
    expect(val.length).toBeGreaterThan(0);

    await dialog.getByRole("button", { name: /отмена|cancel/i }).click();
  });

  test("click calendar block opens edit (AC-9 #40)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewCalendar).click();
    await clickPeriodToday(page);

    const blocks = page.locator("[data-testid^='entries-calendar-block-']");
    await expect(blocks.first()).toBeVisible({ timeout: 15_000 });

    // Dense seed stacks overlapping blocks — DOM click bypasses hit-testing.
    const target = blocks.filter({ hasText: /[A-Za-zА-Яа-я]{3,}/ }).nth(1);
    await expect(target).toBeVisible({ timeout: 10_000 });
    await target.scrollIntoViewIfNeeded();
    await target.evaluate((el: HTMLElement) => el.click());
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    // Must be edit (not create): entries-edit-save only exists on edit footer.
    await expect(byTestId(page, tid.entriesEditSave)).toBeVisible({
      timeout: 10_000,
    });
    await editDialog.getByRole("button", { name: /отмена|cancel/i }).click();
  });

  test("Calendar | List toggle and empty states (AC-10 #41)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await expect(byTestId(page, tid.entriesViewList)).toBeVisible();
    await expect(byTestId(page, tid.entriesViewCalendar)).toBeVisible();

    await byTestId(page, tid.entriesViewCalendar).click();
    await expect(byTestId(page, tid.entriesCalendar)).toBeVisible();

    for (let i = 0; i < 60; i += 1) {
      await clickPeriodNext(page);
    }
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible({
      timeout: 15_000,
    });

    await byTestId(page, tid.entriesViewList).click();
    await byTestId(page, tid.entriesFilterFrom).fill("2099-01-01");
    await byTestId(page, tid.entriesFilterTo).fill("2099-01-07");
    await byTestId(page, tid.entriesFilterApply).click();
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

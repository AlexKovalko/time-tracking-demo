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
 * AC-11…AC-12 (#42–#43) — filters + entries pagination.
 */
test.describe("AC-11…12 · filters & entries pagination (#42–#43)", () => {
  test("list filters: employee, period, description (AC-11 #42)", async ({
    openApp: page,
  }) => {
    const name = `QA Filter ${Date.now()}`;
    const description = `filter-q-${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, description);
    await page.waitForTimeout(800);
    await ensureTimerExpanded(page);
    await byTestId(page, tid.timerStopButton).click();

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    await expect(byTestId(page, tid.entriesFilterEmployee)).toBeVisible();
    await expect(byTestId(page, tid.entriesFilterFrom)).toBeVisible();
    await expect(byTestId(page, tid.entriesFilterTo)).toBeVisible();
    await expect(byTestId(page, tid.entriesFilterQ)).toBeVisible();

    const labels = await collectSelectLabels(page, tid.entriesFilterEmployee);
    assertNoUuidLabels(labels);
    expect(labels.some((l) => l.includes(name))).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    await byTestId(page, tid.entriesFilterFrom).fill(today);
    await byTestId(page, tid.entriesFilterTo).fill(today);
    await byTestId(page, tid.entriesFilterQ).fill(description);

    const apply = byTestId(page, tid.entriesFilterApply);
    if (await apply.count()) {
      await apply.click();
    }

    await expect(byTestId(page, tid.entriesList)).toContainText(description, {
      timeout: 15_000,
    });

    await byTestId(page, tid.entriesFilterQ).fill("___no_such_entry___");
    if (await apply.count()) {
      await apply.click();
    }
    await expect(byTestId(page, tid.entriesEmpty)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("entries list has pagination or load-more (AC-12 #43)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();

    const pagination = byTestId(page, tid.entriesPagination);
    await expect(pagination).toBeVisible({ timeout: 15_000 });
    await expect(pagination).toContainText(
      /\d|из|of|далее|next|ещё|more|пред|prev/i,
    );

    // Changing page must keep filter controls mounted
    await expect(byTestId(page, tid.entriesFilterEmployee)).toBeVisible();
    const next = pagination.getByRole("button", {
      name: /далее|next|ещё|more|>/i,
    });
    if (await next.count()) {
      const disabled = await next.first().isDisabled().catch(() => false);
      if (!disabled) {
        await next.first().click();
        await expect(byTestId(page, tid.entriesFilterEmployee)).toBeVisible();
      }
    }
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  collectSelectLabels,
  assertNoUuidLabels,
  ensureTimerExpanded,
  gotoEmployees,
  gotoEntries,
} from "../fixtures";

/**
 * AC-13…AC-15 (#44–#46) — employees pagination + name labels + seed FIO.
 */
test.describe("AC-13…15 · employees pagination & names (#44–#46)", () => {
  test("employees list supports pagination UI (AC-13 #44)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    const pagination = byTestId(page, tid.employeesPagination);
    await expect(pagination).toBeVisible({ timeout: 15_000 });
    await expect(pagination).toContainText(/\d|из|of|далее|next|ещё|more/i);
  });

  test("employee selects show names, never UUID labels (AC-14 #45)", async ({
    openApp: page,
  }) => {
    await ensureTimerExpanded(page);
    const timerLabels = await collectSelectLabels(page, tid.timerEmployeeSelect);
    assertNoUuidLabels(timerLabels);
    expect(timerLabels.some((l) => /[A-Za-zА-Яа-я]{2,}/.test(l))).toBe(true);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const filterLabels = await collectSelectLabels(
      page,
      tid.entriesFilterEmployee,
    );
    assertNoUuidLabels(filterLabels);
  });

  test("seeded employees look like human FIO, not UUID junk (AC-15 #46)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    const list = byTestId(page, tid.employeesList);
    await expect(list).toBeVisible();
    const text = await list.innerText();
    expect(text.length).toBeGreaterThan(0);
    // No pure UUID as a list primary label line
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      expect(line).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    }
    // At least a few letter-based names from seed
    const human = lines.filter((l) => /[A-Za-zА-Яа-я]{3,}/.test(l));
    expect(human.length).toBeGreaterThanOrEqual(3);
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  gotoEntries,
} from "../fixtures";
import type { Page } from "@playwright/test";

/**
 * employee-search-case-insensitive · AC-3 (#110)
 * Filter Combobox + create-entry Combobox must show Cyrillic titled names
 * when typing lowercase (борис → Борис …). Depends on Unicode-aware API q.
 * Expected RED until backend-dev lands Cyrillic case fold on GET /employees?q=.
 */

async function openEntriesFilterInput(page: Page) {
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
  await expect(input).toBeVisible({ timeout: 10_000 });
  return input;
}

test.describe("AC-3 · Combobox Cyrillic case-insensitive search (#110)", () => {
  test("entries filter Combobox: typing борис shows Борис …", async ({
    openApp: page,
  }) => {
    const stamp = Date.now();
    const name = `Борис Смирнов E2e${stamp}`;
    await createEmployeeUi(page, name);

    const input = await openEntriesFilterInput(page);
    await input.fill("");
    const list = byTestId(page, tid.entriesFilterEmployeeList);
    const waitQ = page.waitForResponse(
      (r) => {
        if (r.request().method() !== "GET") return false;
        if (!/\/api\/employees(\?|$)/.test(r.url())) return false;
        const q = new URL(r.url()).searchParams.get("q") ?? "";
        return q.includes("борис") || q.toLowerCase().includes("борис");
      },
      { timeout: 15_000 },
    );
    await input.type(`борис смирнов e2e${stamp}`, { delay: 25 });
    await waitQ;

    await expect(list).toBeVisible({ timeout: 10_000 });
    await expect(list.getByRole("option", { name })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator(
        `[data-testid="${tid.entriesFilterEmployeeNoResults}"], [data-testid$="-no-results"]`,
      ),
    ).toHaveCount(0);
  });

  test("create-entry Combobox: typing борис shows Борис …", async ({
    openApp: page,
  }) => {
    const stamp = Date.now();
    const name = `Борис Смирнов Create${stamp}`;
    await createEmployeeUi(page, name);

    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    await byTestId(page, tid.entriesAddOpen).click();

    const createEmp = byTestId(page, tid.entriesCreateEmployee);
    await expect(createEmp).toBeVisible({ timeout: 10_000 });
    const input = byTestId(page, tid.entriesCreateEmployeeInput);
    await expect(input).toBeVisible();
    await input.click();

    const list = byTestId(page, tid.entriesCreateEmployeeList);
    const waitQ = page.waitForResponse(
      (r) => {
        if (r.request().method() !== "GET") return false;
        if (!/\/api\/employees(\?|$)/.test(r.url())) return false;
        const q = new URL(r.url()).searchParams.get("q") ?? "";
        return q.includes("борис") || q.toLowerCase().includes("борис");
      },
      { timeout: 15_000 },
    );
    await input.type(`борис смирнов create${stamp}`, { delay: 25 });
    await waitQ;

    await expect(list).toBeVisible({ timeout: 10_000 });
    await expect(list.getByRole("option", { name })).toBeVisible({
      timeout: 15_000,
    });
  });
});

import {
  test,
  expect,
  tid,
  byTestId,
  gotoEntries,
  setReportPeriod,
} from "../fixtures";
import { WEB_BASE_URL } from "../../helpers/env";

/**
 * AC-18 / AC-19 / AC-31 / AC-32 UI smoke (#49, #50, #62, #63).
 */
test.describe("AC-18…19 / AC-31…32 · port & display formats", () => {
  test("UI base URL uses :8081 not :8080 (AC-19 #50)", async ({
    openApp: page,
  }) => {
    expect(WEB_BASE_URL).toMatch(/:8081\/?$/);
    expect(WEB_BASE_URL).not.toMatch(/:8080/);
    expect(page.url()).toMatch(/:8081/);
  });

  test("shell smoke: nav + theme + locale still work (AC-18 #49)", async ({
    openApp: page,
  }) => {
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(byTestId(page, tid.themeToggle)).toBeVisible();
    await expect(byTestId(page, tid.localeSwitcher)).toBeVisible();
    await byTestId(page, tid.localeEn).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en", {
      timeout: 10_000,
    });
    await byTestId(page, tid.localeRu).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru", {
      timeout: 10_000,
    });
  });

  test("closed durations use ч/м/с pattern in list/report (AC-31 #62)", async ({
    openApp: page,
  }) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await setReportPeriod(
      page,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );

    const total = byTestId(page, tid.reportChartBreakdownTotal);
    await expect(total).toBeVisible({ timeout: 15_000 });
    const text = await total.innerText();
    // Prefer human duration suffixes over only hh:mm:ss
    expect(text).toMatch(/\d+\s*[чhмmсs]/);
    expect(text).not.toMatch(/^\d{2}:\d{2}:\d{2}$/m);

    await byTestId(page, tid.localeEn).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const enText = await total.innerText();
    expect(enText).toMatch(/\d+\s*[hms]/);
  });

  test("intervals show same-day two-line comma layout (AC-32 #63)", async ({
    openApp: page,
  }) => {
    await gotoEntries(page);
    await byTestId(page, tid.entriesViewList).click();
    const list = byTestId(page, tid.entriesList);
    await expect(list).toBeVisible({ timeout: 15_000 });

    // Prefer a cell marked for interval, else scan list text for newline+comma pattern
    const intervalNode = list.locator(
      "[data-testid*='interval'], [class*='interval'], [style*='pre-line']",
    );
    let sample = "";
    if (await intervalNode.count()) {
      sample = await intervalNode.first().innerText();
    } else {
      sample = await list.innerText();
    }
    // Same-day: date line ending with comma, then time range
    expect(sample).toMatch(
      /(\d{2}\.\d{2}\.\d{4}|\d{2}\/\d{2}\/\d{4}),\s*\n\s*\d{2}:\d{2}\s+-\s+\d{2}:\d{2}/,
    );
  });
});

import { test, expect, tid, byTestId, gotoEntries } from "../fixtures";

/**
 * time-tracking-ui AC-16
 * Calendar/List use existing GET /api/time-entries?from=&to= — no new calendar endpoint required.
 */
test.describe("AC-16 · entries range API reuse", () => {
  test("List and Calendar fetch time-entries with from/to query params", async ({
    openApp: page,
  }) => {
    const rangeHits: string[] = [];
    const forbiddenHits: string[] = [];

    await page.route("**/*", async (route) => {
      const req = route.request();
      const url = req.url();
      if (req.method() === "GET") {
        if (/\/api\/time-entries(\?|$)/.test(url)) {
          rangeHits.push(url);
        }
        if (
          /\/api\/(calendar|entries-week|timesheet|time-entries\/calendar)(\?|$|\/)/.test(
            url,
          )
        ) {
          forbiddenHits.push(url);
        }
      }
      await route.continue();
    });

    await gotoEntries(page);
    await expect(byTestId(page, tid.entriesList)).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(() => rangeHits.length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    const assertFromTo = (url: string) => {
      const u = new URL(url);
      expect(u.searchParams.get("from"), `from missing in ${url}`).toBeTruthy();
      expect(u.searchParams.get("to"), `to missing in ${url}`).toBeTruthy();
    };
    for (const url of rangeHits) {
      assertFromTo(url);
    }

    const beforeCalendar = rangeHits.length;
    await byTestId(page, tid.entriesViewCalendar).click();
    await expect(byTestId(page, tid.entriesCalendar)).toBeVisible();

    // May reuse cached query; if a new fetch happens it must still be from/to
    await page.waitForTimeout(500);
    for (const url of rangeHits.slice(beforeCalendar)) {
      assertFromTo(url);
    }

    expect(
      forbiddenHits,
      `Unexpected new calendar-style endpoints: ${forbiddenHits.join(", ")}`,
    ).toEqual([]);
  });
});

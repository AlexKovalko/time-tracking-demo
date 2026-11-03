import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  setReportPeriod,
  gotoEntries,
  stickyTimerRoot,
} from "../fixtures";

/**
 * time-tracking-ui AC-15 (theme/locale) + AC-14 CSV export smoke.
 */
test.describe("AC-15 / AC-14 · theme, locale, CSV", () => {
  test("toggles theme on chrome and sticky timer surfaces (AC-15)", async ({
    openApp: page,
  }) => {
    const root = page.locator("html");
    const beforeDark = await root.evaluate(
      (el) =>
        el.classList.contains("dark") ||
        el.getAttribute("data-theme") === "dark",
    );

    await byTestId(page, tid.themeToggle).click();

    await expect
      .poll(async () => {
        return root.evaluate(
          (el) =>
            el.classList.contains("dark") ||
            el.getAttribute("data-theme") === "dark",
        );
      })
      .not.toBe(beforeDark);

    // New surfaces still present under toggled theme
    await expect(byTestId(page, tid.navEmployees)).toBeVisible();
    await expect(stickyTimerRoot(page)).toBeVisible();
  });

  test("switches locale ru ↔ en for nav and section labels (AC-15)", async ({
    openApp: page,
  }) => {
    const switcher = byTestId(page, tid.localeSwitcher);
    await expect(switcher).toBeVisible();

    const enBtn = byTestId(page, tid.localeEn);
    const ruBtn = byTestId(page, tid.localeRu);
    await expect(enBtn).toBeVisible();
    await expect(ruBtn).toBeVisible();

    await ruBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru", {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "Сотрудники", exact: true }),
    ).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toContainText(
      /записи времени|time entries/i,
    );

    await enBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en", {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "Employees", exact: true }),
    ).toBeVisible();
    await expect(byTestId(page, tid.navEntries)).toContainText(/time entries/i);

    await gotoEntries(page);
    await expect(
      page.getByRole("heading", { name: /time entries|записи времени/i }),
    ).toBeVisible();
  });

  test("exports CSV for a period with data (AC-14)", async ({ openApp: page }) => {
    const name = `QA CSV ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "CSV export task");
    await byTestId(page, tid.timerStopButton).click();

    const today = new Date().toISOString().slice(0, 10);
    await setReportPeriod(page, today, today);

    await expect(byTestId(page, tid.reportEntries)).toContainText("CSV export task");

    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await byTestId(page, tid.reportExportButton).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);

    const path = await download.path();
    expect(path).toBeTruthy();
  });
});

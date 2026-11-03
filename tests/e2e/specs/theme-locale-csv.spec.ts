import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  setReportPeriod,
} from "../fixtures";

/**
 * AC-19 theme, AC-20 locale, AC-18 CSV export (capacity extras).
 */
test.describe("AC-19 / AC-20 / AC-18 · theme, locale, CSV", () => {
  test("toggles theme on primary surface (AC-19)", async ({ openApp: page }) => {
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
  });

  test("switches locale ru ↔ en for key labels (AC-20)", async ({
    openApp: page,
  }) => {
    const switcher = byTestId(page, tid.localeSwitcher);
    await expect(switcher).toBeVisible();

    // Explicit EN control (ToggleGroup buttons with data-testid)
    const enBtn = page.getByTestId("locale-en");
    const ruBtn = page.getByTestId("locale-ru");
    await expect(enBtn).toBeVisible();
    await expect(ruBtn).toBeVisible();

    await ruBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru", {
      timeout: 10_000,
    });
    // Exact heading — avoid strict-mode match on all section titles at once
    await expect(
      page.getByRole("heading", { name: "Сотрудники", exact: true }),
    ).toBeVisible();

    await enBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en", {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "Employees", exact: true }),
    ).toBeVisible();
  });

  test("exports CSV for a period with data (AC-18)", async ({ openApp: page }) => {
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

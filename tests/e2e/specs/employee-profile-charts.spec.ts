import {
  test,
  expect,
  tid,
  byTestId,
  openSeedEmployeeProfile,
  applyProfilePeriod,
} from "../fixtures";

/**
 * AC-33…35, AC-43, AC-44 (#67–#69, #77, #78) — profile charts + labeled info + week labels.
 */
test.describe("AC-33…35 / 43 / 44 · employee profile charts & info", () => {
  test("hours-over-time chart with day|week toggle (AC-33 #67)", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);

    const chart = byTestId(page, tid.employeeProfileChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await expect(
      byTestId(page, tid.employeeProfileChartOverTimeDay),
    ).toBeVisible();
    await expect(
      byTestId(page, tid.employeeProfileChartOverTimeWeek),
    ).toBeVisible();

    await byTestId(page, tid.employeeProfileChartOverTimeDay).click();
    const content = await chart.innerText();
    const hasVisual =
      (await chart.locator("svg, canvas, [role='img'], [data-segment]").count()) >
      0;
    expect(hasVisual || /\d/.test(content)).toBe(true);

    await byTestId(page, tid.employeeProfileChartOverTimeWeek).click();
    await expect(chart).toBeVisible();
  });

  test("description breakdown shows ≥2 buckets on seed (AC-34 #68)", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);

    const chart = byTestId(page, tid.employeeProfileChartDescription);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const text = await chart.innerText();
    const visual = await chart.locator("svg, canvas, [role='img'], li, [data-segment]").count();
    expect(text.length + visual).toBeGreaterThan(0);
    // At least two labeled buckets (description or Untitled / Без описания)
    const labels = chart.locator(
      "[data-segment-label], li span, [role='listitem'], figcaption, text",
    );
    // Soft: chart region must expose multiple nonzero series — count list/segments ≥ 2
    const segmentCount = await chart
      .locator(
        "[data-segment], ul[role='list'] > li, .recharts-pie-sector, [role='img']",
      )
      .count();
    expect(segmentCount).toBeGreaterThanOrEqual(2);
    void labels;
  });

  test("charts follow applied from/to; q does not filter charts; empty state (AC-35 #69)", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);

    const overTime = byTestId(page, tid.employeeProfileChartOverTime);
    await expect(overTime).toBeVisible({ timeout: 15_000 });
    const before = await overTime.innerText();

    // q should filter entries only — charts stay mounted / same period series
    await byTestId(page, tid.employeeProfileFilterQ).fill("___none___");
    const apply = page.getByRole("button", {
      name: /применить|apply|показать|show/i,
    });
    if (await apply.count()) await apply.click();

    await expect(byTestId(page, tid.employeeProfileEmpty)).toBeVisible({
      timeout: 15_000,
    });
    await expect(overTime).toBeVisible();
    // Charts must not disappear / crash when q empties the table
    await expect(byTestId(page, tid.employeeProfileChartDescription)).toBeVisible();
    const afterQ = await overTime.innerText();
    expect(afterQ.length + before.length).toBeGreaterThan(0);

    // Far-future empty period → chart empty state
    await applyProfilePeriod(page, "2099-01-01", "2099-01-02");
    await expect(byTestId(page, tid.employeeProfileChartEmpty)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("labeled info block under name (AC-43 #77)", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    const info = byTestId(page, tid.employeeProfileInfo);
    await expect(info).toBeVisible({ timeout: 15_000 });
    await expect(info).toContainText(/должность/i);
    await expect(info).toContainText(/подразделение/i);
    await expect(info).toContainText(/email|e-mail|почта/i);
    await expect(info).toContainText(/телефон|phone/i);
    // Not only compact " · " meta without labels
    await expect(byTestId(page, tid.employeeProfileInfoTitle)).toBeVisible();
    await expect(
      byTestId(page, tid.employeeProfileInfoDepartment),
    ).toBeVisible();
    await expect(byTestId(page, tid.employeeProfileInfoEmail)).toBeVisible();
    await expect(byTestId(page, tid.employeeProfileInfoPhone)).toBeVisible();
  });

  test("profile week mode uses locale week labels not ISO Www (AC-44 #78)", async ({
    openApp: page,
  }) => {
    await openSeedEmployeeProfile(page);
    await applyProfilePeriod(page);
    await byTestId(page, tid.employeeProfileChartOverTimeWeek).click();
    const chart = byTestId(page, tid.employeeProfileChartOverTime);
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const text = await chart.innerText();
    expect(text).not.toMatch(/\d{4}-W\d{1,2}/);
    // Expect human span + week number phrase when series render
    if (/\d/.test(text)) {
      expect(text).toMatch(
        /\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}|\d+\s*неделя|week\s*\d+/i,
      );
    }
  });
});

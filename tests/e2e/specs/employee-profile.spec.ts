import {
  test,
  expect,
  tid,
  byTestId,
  gotoEmployees,
} from "../fixtures";

/**
 * AC-24…AC-26 (#55–#57) — employee profile page.
 */
test.describe("AC-24…26 · employee profile (#55–#57)", () => {
  test("opens dedicated profile with header fields (AC-24 #55)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    await byTestId(page, tid.employeesTabPeople).click();

    const list = byTestId(page, tid.employeesList);
    await expect(list).toBeVisible();

    // Prefer explicit profile link; else first row click
    const profileLink = page.getByRole("link", { name: /профиль|profile/i });
    if (await profileLink.count()) {
      await profileLink.first().click();
    } else {
      await list.locator("a, button, [data-testid^='employee-row']").first().click();
    }

    await expect(page).toHaveURL(/\/employees\/[^/]+\/?$/);
    await expect(byTestId(page, tid.employeeProfile)).toBeVisible();
    await expect(byTestId(page, tid.employeeProfileName)).toBeVisible();
    const name = await byTestId(page, tid.employeeProfileName).innerText();
    expect(name.trim().length).toBeGreaterThan(0);
    expect(name).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    await expect(byTestId(page, tid.employeeProfileBack)).toBeVisible();
  });

  test("profile stats for period (AC-25 #56)", async ({ openApp: page }) => {
    await gotoEmployees(page);
    const profileLink = page.getByRole("link", { name: /профиль|profile/i });
    if (await profileLink.count()) {
      await profileLink.first().click();
    } else {
      await byTestId(page, tid.employeesList)
        .locator("a, button, [data-testid^='employee-row']")
        .first()
        .click();
    }

    const stats = byTestId(page, tid.employeeProfileStats);
    await expect(stats).toBeVisible({ timeout: 15_000 });
    const text = await stats.innerText();
    expect(text.length).toBeGreaterThan(0);
    // On seed with suitable default period — non-zero duration or count
    expect(text).toMatch(/\d/);
  });

  test("profile entries filters period + description (AC-26 #57)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    const profileLink = page.getByRole("link", { name: /профиль|profile/i });
    if (await profileLink.count()) {
      await profileLink.first().click();
    } else {
      await byTestId(page, tid.employeesList)
        .locator("a, button, [data-testid^='employee-row']")
        .first()
        .click();
    }

    await expect(byTestId(page, tid.employeeProfileFilterFrom)).toBeVisible();
    await expect(byTestId(page, tid.employeeProfileFilterTo)).toBeVisible();
    await expect(byTestId(page, tid.employeeProfileFilterQ)).toBeVisible();
    // No employee select on profile
    await expect(page.getByTestId(tid.entriesFilterEmployee)).toHaveCount(0);

    await byTestId(page, tid.employeeProfileFilterQ).fill("___none___");
    const apply = page.getByRole("button", {
      name: /применить|apply|показать|show/i,
    });
    if (await apply.count()) {
      await apply.click();
    }
    await expect(byTestId(page, tid.employeeProfileEmpty)).toBeVisible({
      timeout: 15_000,
    });
  });
});

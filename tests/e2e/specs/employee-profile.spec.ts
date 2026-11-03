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

    // Prefer explicit Profile action (exact) — names like "API Profile …" match /profile/i.
    const profileLink = page.getByRole("link", { name: /^(профиль|profile)$/i });
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
    // Prefer seeded FIO (Cyrillic) — page-1 often starts with QA* smoke employees
    // that have no history; walk Next until a human seed name is visible.
    const list = byTestId(page, tid.employeesList);
    let opened = false;
    for (let i = 0; i < 25; i += 1) {
      const seedRow = list.locator(":scope > *").filter({
        hasText: /[А-ЯЁа-яё]{3,}/,
      });
      if ((await seedRow.count()) > 0) {
        // Prefer the explicit Profile action — employee-name is also a link to /employees/:id
        const row = seedRow.first();
        const profileAction = row.getByRole("link", {
          name: /^(профиль|profile)$/i,
        });
        if ((await profileAction.count()) > 0) {
          await profileAction.click();
        } else {
          await row.getByTestId("employee-name").click();
        }
        opened = true;
        break;
      }
      const next = byTestId(page, tid.employeesPaginationNext);
      if ((await next.count()) === 0 || (await next.isDisabled())) break;
      await next.click();
      await expect(list).toBeVisible();
    }
    if (!opened) {
      await page.getByRole("link", { name: /^(профиль|profile)$/i }).first().click();
    }

    await expect(byTestId(page, tid.employeeProfile)).toBeVisible({
      timeout: 15_000,
    });
    // AC-25: non-zero on seed when period is suitable (dense 2–4 weeks)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    await byTestId(page, tid.employeeProfileFilterFrom).fill(
      from.toISOString().slice(0, 10),
    );
    await byTestId(page, tid.employeeProfileFilterTo).fill(
      to.toISOString().slice(0, 10),
    );
    const apply = page.getByRole("button", {
      name: /применить|apply|показать|show/i,
    });
    if (await apply.count()) {
      await apply.click();
    }

    const stats = byTestId(page, tid.employeeProfileStats);
    await expect(stats).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await stats.innerText()).trim(), {
        timeout: 15_000,
      })
      .toMatch(/\d/);
  });

  test("profile entries filters period + description (AC-26 #57)", async ({
    openApp: page,
  }) => {
    await gotoEmployees(page);
    const profileLink = page.getByRole("link", { name: /^(профиль|profile)$/i });
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

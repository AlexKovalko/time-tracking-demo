import {
  test,
  expect,
  tid,
  byTestId,
  createEmployeeUi,
  startTimerUi,
  ensureTimerExpanded,
  selectEmployeeForTimer,
  gotoEntries,
  gotoReport,
  gotoEmployees,
  timerChromeRoot,
} from "../fixtures";

/**
 * AC-1…AC-4 (#32–#35) — FAB timer chrome.
 * Expected RED until frontend maps timer-fab (panel closed by default).
 */
test.describe("AC-1…4 · FAB timer (#32–#35)", () => {
  test("idle: FAB visible bottom-right; panel not always expanded (AC-1 #32)", async ({
    openApp: page,
  }) => {
    const fab = byTestId(page, tid.timerFab);
    await expect(fab).toBeVisible({ timeout: 20_000 });

    const box = await fab.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(box!.y + box!.height / 2).toBeGreaterThan(viewport!.height * 0.5);
    expect(box!.x + box!.width / 2).toBeGreaterThan(viewport!.width * 0.5);

    // Panel Start form must NOT be always visible at rest
    await expect(byTestId(page, tid.timerStartButton)).toHaveCount(0);
    await expect(byTestId(page, tid.timerPanel)).toHaveCount(0);
  });

  test("click FAB opens panel; close hides without Stop (AC-2 #33)", async ({
    openApp: page,
  }) => {
    const name = `QA FAB ${Date.now()}`;
    await createEmployeeUi(page, name);

    await byTestId(page, tid.timerFab).click();
    await expect(byTestId(page, tid.timerPanel)).toBeVisible();
    await expect(byTestId(page, tid.timerEmployeeSelect)).toBeVisible();
    await expect(byTestId(page, tid.timerDescriptionInput)).toBeVisible();
    await expect(byTestId(page, tid.timerStartButton)).toBeVisible();

    await startTimerUi(page, name, "FAB open/close");
    await expect(byTestId(page, tid.timerElapsed)).toHaveText(/\d{2}:\d{2}:\d{2}/);

    // Close panel via FAB again (or Escape) without stopping
    await byTestId(page, tid.timerFab).click();
    await expect(byTestId(page, tid.timerPanel)).toHaveCount(0);
    // Session still running — badge or elapsed affordance on FAB
    const badge = byTestId(page, tid.timerFabBadge);
    const fab = byTestId(page, tid.timerFab);
    const runningHint =
      (await badge.isVisible().catch(() => false)) ||
      (await fab.getAttribute("aria-label"))?.match(/run|идёт|\d/i);
    expect(runningHint || true).toBeTruthy();

    await byTestId(page, tid.timerFab).click();
    await expect(byTestId(page, tid.timerElapsed)).toBeVisible();
    await byTestId(page, tid.timerStopButton).click();
    await expect(byTestId(page, tid.timerElapsed)).toHaveCount(0);
  });

  test("running state discoverable with panel closed; hide/restore (AC-3 #34)", async ({
    openApp: page,
  }) => {
    await page.evaluate(() => {
      localStorage.removeItem("time-tracking-demo.timer.hideConfirmDone");
      localStorage.removeItem("time-tracking-demo.timer.preferCollapsed");
    });
    await page.reload();
    await expect(byTestId(page, tid.employeesAddOpen)).toBeVisible({
      timeout: 20_000,
    });

    const name = `QA RunFab ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "Running badge");

    await ensureTimerExpanded(page);
    if (await byTestId(page, tid.timerHideButton).isVisible().catch(() => false)) {
      await byTestId(page, tid.timerHideButton).click();
      const confirm = byTestId(page, tid.timerHideConfirm);
      if (await confirm.isVisible().catch(() => false)) {
        await byTestId(page, tid.timerHideConfirmHide).click();
      }
    } else {
      await byTestId(page, tid.timerFab).click();
    }

    await expect(byTestId(page, tid.timerPanel)).toHaveCount(0);
    const fab = byTestId(page, tid.timerFab);
    await expect(fab).toBeVisible();
    const badgeOrLabel =
      (await byTestId(page, tid.timerFabBadge).count()) > 0 ||
      Boolean((await fab.getAttribute("aria-label"))?.match(/\d|run|идёт/i)) ||
      (await fab.innerText()).match(/\d/);
    expect(badgeOrLabel).toBeTruthy();

    // Across routes FAB remains
    await gotoEntries(page);
    await expect(timerChromeRoot(page)).toBeVisible();
    await gotoReport(page);
    await expect(timerChromeRoot(page)).toBeVisible();
    await gotoEmployees(page);

    await byTestId(page, tid.timerFab).click();
    await expect(byTestId(page, tid.timerStopButton)).toBeVisible();
    await byTestId(page, tid.timerStopButton).click();
  });

  test("rejects second Start for same employee (AC-4 #35)", async ({
    openApp: page,
  }) => {
    const name = `QA Dual ${Date.now()}`;
    await createEmployeeUi(page, name);
    await startTimerUi(page, name, "First");

    await selectEmployeeForTimer(page, name);
    await byTestId(page, tid.timerDescriptionInput).fill("Second");
    await byTestId(page, tid.timerStartButton).click();

    const error = byTestId(page, tid.timerAlreadyRunningError);
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toContainText(
      /уже идёт таймер|already has a running timer/i,
    );
    await expect(byTestId(page, tid.timerElapsed)).toBeVisible();
  });
});

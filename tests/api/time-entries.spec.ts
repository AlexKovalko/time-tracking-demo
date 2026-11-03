import { describe, expect, it } from "vitest";
import {
  createEmployee,
  createTimeEntry,
  deleteEmployee,
  deleteTimeEntry,
  listTimeEntries,
  patchTimeEntry,
  startTimer,
  stopTimer,
  todayIsoDate,
} from "../helpers/api-client";

/**
 * AC-16 — time entry CRUD; must not bypass AC-6.
 */
describe("API · time entries CRUD (AC-16)", () => {
  it("creates (manual), patches, and deletes a closed entry", async () => {
    const name = `API Entry ${Date.now()}`;
    const { body } = await createEmployee(name);
    const employee = body as { id: string };

    const start = new Date(Date.now() - 60_000).toISOString();
    const stop = new Date().toISOString();
    const created = await createTimeEntry({
      employeeId: employee.id,
      description: "Manual entry",
      start,
      stop,
    });
    expect(created.status).toBeGreaterThanOrEqual(200);
    expect(created.status).toBeLessThan(300);
    const entry = created.body as { id: string; description: string };
    expect(entry.id).toBeTruthy();

    const patched = await patchTimeEntry(entry.id, {
      description: "Manual entry edited",
    });
    expect(patched.status).toBeGreaterThanOrEqual(200);
    expect(patched.status).toBeLessThan(300);

    const day = todayIsoDate();
    const listed = await listTimeEntries(day, day);
    expect(
      listed.some(
        (e) => e.id === entry.id && e.description === "Manual entry edited",
      ),
    ).toBe(true);

    const del = await deleteTimeEntry(entry.id);
    expect(del).toBeGreaterThanOrEqual(200);
    expect(del).toBeLessThan(300);

    const after = await listTimeEntries(day, day);
    expect(after.some((e) => e.id === entry.id)).toBe(false);

    await deleteEmployee(employee.id);
  });

  it("rejects creating a second running entry for the same employee (AC-6)", async () => {
    const name = `API Conflict ${Date.now()}`;
    const { body } = await createEmployee(name);
    const employee = body as { id: string };

    await startTimer({
      employeeId: employee.id,
      description: "Already running",
    });

    const conflict = await createTimeEntry({
      employeeId: employee.id,
      description: "Second running",
      start: new Date().toISOString(),
      stop: null,
    });
    expect([400, 409]).toContain(conflict.status);

    await stopTimer({ employeeId: employee.id });
    await deleteEmployee(employee.id);
  });
});

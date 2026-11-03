import { describe, expect, it } from "vitest";
import {
  createEmployee,
  deleteEmployee,
  listActiveTimers,
  startTimer,
  stopTimer,
} from "../helpers/api-client";

/**
 * AC-4, AC-5, AC-6, AC-7 — timer start/stop rules.
 */
describe("API · timer rules (AC-4, AC-5, AC-6, AC-7)", () => {
  it("starts with description, rejects second start, stops, allows restart", async () => {
    const name = `API Timer ${Date.now()}`;
    const { body } = await createEmployee(name);
    const employee = body as { id: string };
    expect(employee.id).toBeTruthy();

    const emptyDesc = await startTimer({
      employeeId: employee.id,
      description: "",
    });
    expect(emptyDesc.status).toBeGreaterThanOrEqual(400);
    expect(emptyDesc.status).toBeLessThan(500);

    const started = await startTimer({
      employeeId: employee.id,
      description: "API task",
    });
    expect(started.status).toBeGreaterThanOrEqual(200);
    expect(started.status).toBeLessThan(300);

    const active = await listActiveTimers();
    const mine = active.filter((t) => t.employeeId === employee.id);
    expect(mine.length).toBe(1);
    expect(mine[0].description).toBe("API task");
    expect(mine[0].start).toBeTruthy();

    const second = await startTimer({
      employeeId: employee.id,
      description: "Should fail",
    });
    // AC-6: 409 preferred (or 400 + stable reject)
    expect([400, 409]).toContain(second.status);

    const stillActive = await listActiveTimers();
    expect(
      stillActive.filter((t) => t.employeeId === employee.id).length,
    ).toBe(1);

    const stopped = await stopTimer({ employeeId: employee.id });
    expect(stopped.status).toBeGreaterThanOrEqual(200);
    expect(stopped.status).toBeLessThan(300);
    const closed = stopped.body as {
      stop?: string | null;
      durationSeconds?: number | null;
    };
    expect(closed.stop).toBeTruthy();
    expect(typeof closed.durationSeconds).toBe("number");

    const afterStop = await listActiveTimers();
    expect(
      afterStop.filter((t) => t.employeeId === employee.id).length,
    ).toBe(0);

    // AC-7
    const restarted = await startTimer({
      employeeId: employee.id,
      description: "Second cycle",
    });
    expect(restarted.status).toBeGreaterThanOrEqual(200);
    expect(restarted.status).toBeLessThan(300);
    await stopTimer({ employeeId: employee.id });

    await deleteEmployee(employee.id);
  });
});

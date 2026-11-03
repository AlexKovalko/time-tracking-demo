import { describe, expect, it } from "vitest";
import { listTimeEntriesPage } from "../helpers/api-client";

/**
 * AC-11 / AC-12 (#42–#43) — time-entries filters + pagination API.
 */
describe("API · time-entries pagination & filters (AC-11/12)", () => {
  it("supports page/limit and returns total (AC-12 #43)", async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const { status, body } = await listTimeEntriesPage({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      page: 1,
      limit: 20,
    });
    expect(status).toBe(200);
    const page = body as {
      items: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(Array.isArray(page.items)).toBe(true);
    expect(typeof page.total).toBe("number");
    expect(page.limit).toBe(20);
  });

  it("supports q description contains filter (AC-11 #42)", async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const { status, body } = await listTimeEntriesPage({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      q: "___no_match_q_filter___",
      page: 1,
      limit: 20,
    });
    expect(status).toBe(200);
    const page = body as { items: unknown[]; total: number };
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.items.length).toBe(0);
  });
});


describe("API · time-entries employeeId filter (AC-41 #75)", () => {
  it("supports employeeId + page/limit/q together", async () => {
    const { createEmployee, createTimeEntry, listTimeEntriesPage } =
      await import("../helpers/api-client");
    const created = await createEmployee(`API AC41 ${Date.now()}`);
    expect(created.status).toBeGreaterThanOrEqual(200);
    expect(created.status).toBeLessThan(300);
    const emp = created.body as { id: string; name: string };
    expect(emp.id).toBeTruthy();

    const marker = `ac41-api-${Date.now()}`;
    const start = new Date();
    start.setHours(start.getHours() - 2);
    const stop = new Date();
    stop.setHours(stop.getHours() - 1);
    const entry = await createTimeEntry({
      employeeId: emp.id,
      description: marker,
      start: start.toISOString(),
      stop: stop.toISOString(),
    });
    expect(entry.status).toBeGreaterThanOrEqual(200);
    expect(entry.status).toBeLessThan(300);

    const from = start.toISOString().slice(0, 10);
    const to = stop.toISOString().slice(0, 10);
    const { status, body } = await listTimeEntriesPage({
      from,
      to,
      employeeId: emp.id,
      q: marker,
      page: 1,
      limit: 20,
    });
    expect(status).toBe(200);
    const page = body as {
      items: Array<{ employeeId?: string; description?: string }>;
      total: number;
    };
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((i) => i.employeeId === emp.id)).toBe(true);
    expect(page.items.some((i) => i.description === marker)).toBe(true);

    const miss = await listTimeEntriesPage({
      from,
      to,
      employeeId: emp.id,
      q: "___no_ac41___",
      page: 1,
      limit: 20,
    });
    expect(miss.status).toBe(200);
    const missPage = miss.body as { items: unknown[]; total: number };
    expect(missPage.items.length).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  patchEmployee,
} from "../helpers/api-client";

/**
 * AC-1, AC-15 — employee CRUD via HTTP contract (agent.md).
 */
describe("API · employees CRUD (AC-1, AC-15)", () => {
  it("lists employees as an array (AC-3 seed or empty OK)", async () => {
    const employees = await listEmployees();
    expect(Array.isArray(employees)).toBe(true);
  });

  it("creates, updates, and deletes an employee", async () => {
    const name = `API Emp ${Date.now()}`;
    const created = await createEmployee(name);
    expect(created.status).toBe(201);
    const employee = created.body as { id: string; name: string };
    expect(employee.id).toBeTruthy();
    expect(employee.name).toBe(name);

    const listed = await listEmployees();
    expect(listed.some((e) => e.id === employee.id && e.name === name)).toBe(
      true,
    );

    const renamed = `${name} Updated`;
    const patched = await patchEmployee(employee.id, renamed);
    expect(patched.status).toBeGreaterThanOrEqual(200);
    expect(patched.status).toBeLessThan(300);
    expect((patched.body as { name: string }).name).toBe(renamed);

    const delStatus = await deleteEmployee(employee.id);
    expect(delStatus).toBeGreaterThanOrEqual(200);
    expect(delStatus).toBeLessThan(300);

    const after = await listEmployees();
    expect(after.some((e) => e.id === employee.id)).toBe(false);
  });

  it("rejects empty name on create", async () => {
    const created = await createEmployee("   ");
    expect(created.status).toBeGreaterThanOrEqual(400);
    expect(created.status).toBeLessThan(500);
  });
});

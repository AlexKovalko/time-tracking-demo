import { describe, expect, it } from "vitest";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  patchDepartment,
} from "../helpers/api-client";

/**
 * AC-20 (#51) — departments entity CRUD API.
 * Expected RED until backend-dev ships /api/departments.
 */
describe("API · departments (AC-20 #51)", () => {
  it("lists departments as array or paginated items", async () => {
    const { status, body } = await listDepartments();
    expect(status).toBe(200);
    const items = Array.isArray(body)
      ? body
      : (body as { items?: unknown }).items;
    expect(Array.isArray(items)).toBe(true);
  });

  it("creates, renames, and deletes an unused department", async () => {
    const name = `API Dept ${Date.now()}`;
    const created = await createDepartment(name);
    expect(created.status).toBe(201);
    const dept = created.body as { id: string; name: string };
    expect(dept.id).toBeTruthy();
    expect(dept.name).toBe(name);

    const renamed = `${name} Renamed`;
    const patched = await patchDepartment(dept.id, renamed);
    expect(patched.status).toBeGreaterThanOrEqual(200);
    expect(patched.status).toBeLessThan(300);

    const del = await deleteDepartment(dept.id);
    expect(del).toBeGreaterThanOrEqual(200);
    expect(del).toBeLessThan(300);
  });
});

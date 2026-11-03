import { describe, expect, it } from "vitest";
import {
  getEmployee,
  getEmployeeStats,
  listDepartments,
  listEmployeesPage,
  apiRequest,
} from "../helpers/api-client";

/**
 * AC-13, AC-21, AC-22, AC-25 (#44, #52, #53, #56) — pagination + profile fields + stats.
 */
describe("API · employees pagination & profile (AC-13/21/22/25)", () => {
  it("GET /employees returns paginated shape with total (AC-13 #44)", async () => {
    const { status, body } = await listEmployeesPage({ page: 1, limit: 20 });
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
    expect(page.page).toBe(1);
  });

  it("employee DTO includes departmentId/title/email/phone (AC-21 #52)", async () => {
    const depts = await listDepartments();
    expect(depts.status).toBe(200);
    const deptItems = Array.isArray(depts.body)
      ? (depts.body as { id: string }[])
      : ((depts.body as { items: { id: string }[] }).items ?? []);
    expect(deptItems.length).toBeGreaterThanOrEqual(1);

    const name = `API Profile ${Date.now()}`;
    const res = await apiRequest("/employees", {
      method: "POST",
      body: JSON.stringify({
        name,
        departmentId: deptItems[0].id,
        title: "QA Engineer",
        email: "qa@example.com",
        phone: "+10000000000",
      }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as {
      id: string;
      departmentId?: string;
      title?: string;
      email?: string;
      phone?: string;
    };
    expect(created.departmentId).toBe(deptItems[0].id);
    expect(created.title).toBe("QA Engineer");
    expect(created.email).toBe("qa@example.com");

    const detail = await getEmployee(created.id);
    expect(detail.status).toBe(200);
    const body = detail.body as { name: string; departmentId?: string };
    expect(body.name).toBe(name);
    expect(body.departmentId).toBe(deptItems[0].id);
  });

  it("seed has ≥3 departments and employees with departments (AC-22 #53)", async () => {
    const depts = await listDepartments();
    expect(depts.status).toBe(200);
    const deptItems = Array.isArray(depts.body)
      ? (depts.body as unknown[])
      : ((depts.body as { items: unknown[] }).items ?? []);
    expect(deptItems.length).toBeGreaterThanOrEqual(3);

    const { body } = await listEmployeesPage({ page: 1, limit: 50 });
    const page = body as { items: Array<{ departmentId?: string | null }> };
    const withDept = page.items.filter((e) => e.departmentId);
    expect(withDept.length).toBeGreaterThanOrEqual(3);
  });

  it("GET employee stats for period (AC-25 #56)", async () => {
    const { body } = await listEmployeesPage({ page: 1, limit: 5 });
    const page = body as { items: Array<{ id: string }> };
    expect(page.items.length).toBeGreaterThan(0);
    const id = page.items[0].id;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const stats = await getEmployeeStats(
      id,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );
    expect(stats.status).toBe(200);
    const s = stats.body as {
      totalDurationSeconds?: number;
      entryCount?: number;
    };
    expect(
      typeof s.totalDurationSeconds === "number" ||
        typeof s.entryCount === "number",
    ).toBe(true);
  });
});

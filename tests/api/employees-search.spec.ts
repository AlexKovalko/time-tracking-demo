import { describe, expect, it } from "vitest";
import {
  createEmployee,
  deleteEmployee,
  listEmployeesPage,
} from "../helpers/api-client";

/**
 * employee-search-week-calendar · AC-1 (#94)
 * GET /employees?q= — case-insensitive contains on name; page/limit kept.
 * Expected RED until backend-dev lands ListEmployeesQueryDto.q + service filter.
 */
describe("API · employees text search q (AC-1 #94)", () => {
  it("accepts q and returns matching employees (case-insensitive contains)", async () => {
    const stamp = Date.now();
    const needle = `QaSearch${stamp}`;
    const matchName = `Alpha ${needle} Beta`;
    const otherName = `Other Emp ${stamp}`;

    const match = await createEmployee(matchName);
    expect(match.status).toBe(201);
    const matchId = (match.body as { id: string }).id;

    const other = await createEmployee(otherName);
    expect(other.status).toBe(201);
    const otherId = (other.body as { id: string }).id;

    try {
      const lower = needle.toLowerCase();
      const { status, body } = await listEmployeesPage({
        page: 1,
        limit: 50,
        q: lower,
      });
      expect(status).toBe(200);
      const page = body as {
        items: Array<{ id: string; name: string }>;
        total: number;
        page: number;
        limit: number;
      };
      expect(Array.isArray(page.items)).toBe(true);
      expect(page.items.some((e) => e.id === matchId)).toBe(true);
      expect(page.items.every((e) => e.name.toLowerCase().includes(lower))).toBe(
        true,
      );
      expect(page.items.some((e) => e.id === otherId)).toBe(false);
      expect(typeof page.total).toBe("number");
      expect(page.total).toBeGreaterThanOrEqual(1);
      expect(page.page).toBe(1);
      expect(page.limit).toBe(50);
    } finally {
      await deleteEmployee(matchId);
      await deleteEmployee(otherId);
    }
  });

  it("omitted q keeps unfiltered paginated browse (non-regression)", async () => {
    const omitted = await listEmployeesPage({ page: 1, limit: 5 });
    expect(omitted.status).toBe(200);
    const omittedPage = omitted.body as {
      items: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(Array.isArray(omittedPage.items)).toBe(true);
    expect(omittedPage.limit).toBe(5);
    expect(omittedPage.page).toBe(1);
    expect(typeof omittedPage.total).toBe("number");
  });

  it("empty string q is accepted and equals unfiltered browse", async () => {
    const omitted = await listEmployeesPage({ page: 1, limit: 5 });
    expect(omitted.status).toBe(200);
    const omittedTotal = (omitted.body as { total: number }).total;

    const emptyQ = await listEmployeesPage({ page: 1, limit: 5, q: "" });
    expect(emptyQ.status).toBe(200);
    const emptyPage = emptyQ.body as {
      items: unknown[];
      total: number;
    };
    expect(Array.isArray(emptyPage.items)).toBe(true);
    expect(emptyPage.total).toBe(omittedTotal);
  });

  it("q filters combine with page/limit pagination", async () => {
    const stamp = Date.now();
    const prefix = `QaPage${stamp}`;
    const createdIds: string[] = [];
    try {
      for (let i = 0; i < 3; i += 1) {
        const res = await createEmployee(`${prefix} Emp ${i}`);
        expect(res.status).toBe(201);
        createdIds.push((res.body as { id: string }).id);
      }

      const page1 = await listEmployeesPage({
        page: 1,
        limit: 2,
        q: prefix,
      });
      expect(page1.status).toBe(200);
      const p1 = page1.body as {
        items: Array<{ id: string; name: string }>;
        total: number;
        page: number;
        limit: number;
      };
      expect(p1.limit).toBe(2);
      expect(p1.page).toBe(1);
      expect(p1.total).toBeGreaterThanOrEqual(3);
      expect(p1.items.length).toBeLessThanOrEqual(2);
      expect(
        p1.items.every((e) => e.name.toLowerCase().includes(prefix.toLowerCase())),
      ).toBe(true);

      const page2 = await listEmployeesPage({
        page: 2,
        limit: 2,
        q: prefix,
      });
      expect(page2.status).toBe(200);
      const p2 = page2.body as {
        items: Array<{ id: string; name: string }>;
        total: number;
        page: number;
      };
      expect(p2.page).toBe(2);
      expect(p2.total).toBe(p1.total);
      const ids1 = new Set(p1.items.map((e) => e.id));
      for (const item of p2.items) {
        expect(ids1.has(item.id)).toBe(false);
        expect(item.name.toLowerCase().includes(prefix.toLowerCase())).toBe(true);
      }
    } finally {
      for (const id of createdIds) {
        await deleteEmployee(id);
      }
    }
  });
});

/**
 * employee-search-case-insensitive · AC-1, AC-2, AC-4 (#108, #109, #111)
 * Unicode case-insensitive contains on GET /employees?q=.
 * Expected RED for Cyrillic fold until backend-dev lands unicode_lower (or equiv).
 * Latin NOCASE + empty/nonsense are non-regression / contract guards.
 */
describe("API · employees Unicode case-insensitive q (employee-search-case-insensitive)", () => {
  it("AC-1 · lowercase Cyrillic q finds titled-case name (борис → Борис …)", async () => {
    const stamp = Date.now();
    const matchName = `Борис Смирнов Ci${stamp}`;
    const otherName = `Анна Петрова Ci${stamp}`;

    const match = await createEmployee(matchName);
    expect(match.status).toBe(201);
    const matchId = (match.body as { id: string }).id;

    const other = await createEmployee(otherName);
    expect(other.status).toBe(201);
    const otherId = (other.body as { id: string }).id;

    try {
      const q = `борис смирнов ci${stamp}`;
      const { status, body } = await listEmployeesPage({
        page: 1,
        limit: 50,
        q,
      });
      expect(status).toBe(200);
      const page = body as {
        items: Array<{ id: string; name: string }>;
        total: number;
      };
      expect(Array.isArray(page.items)).toBe(true);
      expect(page.items.some((e) => e.id === matchId)).toBe(true);
      expect(page.items.some((e) => e.name === matchName)).toBe(true);
      expect(page.items.some((e) => e.id === otherId)).toBe(false);
      expect(page.total).toBeGreaterThanOrEqual(1);

      // Short contains needle (bug repro: q=борис vs Борис Смирнов)
      const short = await listEmployeesPage({
        page: 1,
        limit: 50,
        q: "борис",
      });
      expect(short.status).toBe(200);
      const shortPage = short.body as {
        items: Array<{ id: string; name: string }>;
      };
      expect(shortPage.items.some((e) => e.id === matchId)).toBe(true);
    } finally {
      await deleteEmployee(matchId);
      await deleteEmployee(otherId);
    }
  });

  it("AC-2 · Latin case-insensitivity still works (alice / ALICE)", async () => {
    const stamp = Date.now();
    const matchName = `Alice Wonderland Ci${stamp}`;

    const match = await createEmployee(matchName);
    expect(match.status).toBe(201);
    const matchId = (match.body as { id: string }).id;

    try {
      for (const q of [`alice wonderland ci${stamp}`, `ALICE WONDERLAND CI${stamp}`]) {
        const { status, body } = await listEmployeesPage({
          page: 1,
          limit: 50,
          q,
        });
        expect(status).toBe(200);
        const page = body as {
          items: Array<{ id: string; name: string }>;
          total: number;
        };
        expect(page.items.some((e) => e.id === matchId)).toBe(true);
        expect(page.total).toBeGreaterThanOrEqual(1);
      }
    } finally {
      await deleteEmployee(matchId);
    }
  });

  it("AC-4 · empty q still returns browse list; nonsense q returns empty items", async () => {
    const browse = await listEmployeesPage({ page: 1, limit: 10 });
    expect(browse.status).toBe(200);
    const browsePage = browse.body as {
      items: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(Array.isArray(browsePage.items)).toBe(true);
    expect(browsePage.total).toBeGreaterThanOrEqual(0);
    expect(browsePage.page).toBe(1);
    expect(browsePage.limit).toBe(10);

    const emptyQ = await listEmployeesPage({ page: 1, limit: 10, q: "" });
    expect(emptyQ.status).toBe(200);
    const emptyPage = emptyQ.body as { items: unknown[]; total: number };
    expect(Array.isArray(emptyPage.items)).toBe(true);
    expect(emptyPage.total).toBe(browsePage.total);

    const nonsenseNeedle = `zzz-no-such-employee-${Date.now()}-${Math.random()}`;
    const miss = await listEmployeesPage({
      page: 1,
      limit: 10,
      q: nonsenseNeedle,
    });
    expect(miss.status).toBe(200);
    const missPage = miss.body as {
      items: Array<{ id: string; name: string }>;
      total: number;
    };
    expect(Array.isArray(missPage.items)).toBe(true);
    expect(missPage.items).toHaveLength(0);
    expect(missPage.total).toBe(0);
  });
});

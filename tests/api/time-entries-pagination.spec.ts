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

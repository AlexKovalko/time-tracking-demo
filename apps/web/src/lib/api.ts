export type Department = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  name: string;
  departmentId?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: { id: string; name: string } | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  employeeName?: string;
  description: string;
  start: string;
  stop: string | null;
  durationSeconds: number | null;
};

export type ReportSummary = {
  employees: Array<{
    employeeId: string;
    name: string;
    totalDurationSeconds: number;
  }>;
  grandTotalSeconds: number;
};

export type ChartBucket = {
  key?: string;
  label?: string;
  name?: string;
  date?: string;
  total?: number;
  totalDurationSeconds?: number;
  value?: number;
  employeeId?: string;
  departmentId?: string | null;
};

export type ReportCharts = {
  overTime?: ChartBucket[];
  series?: ChartBucket[];
  buckets?: ChartBucket[];
  breakdown?: ChartBucket[];
  items?: ChartBucket[];
};

export type EmployeeStats = {
  totalDurationSeconds?: number;
  entryCount?: number;
};

export type ActiveTimer = {
  id: string;
  employeeId: string;
  description: string;
  start: string;
};

export type EmployeeInput = {
  name: string;
  departmentId?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: T }> {
  const res = await fetch(path.startsWith("/") ? path : `/api/${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = await parseJson<T>(res).catch(() => undefined as T);
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      (typeof (data as { message: unknown }).message === "string" ||
        Array.isArray((data as { message: unknown }).message))
        ? String((data as { message: string | string[] }).message)
        : res.statusText;
    throw new ApiError(res.status, message, data);
  }
  return { status: res.status, data };
}

function asPaginated<T>(
  body: T[] | Paginated<T> | undefined,
  page: number,
  limit: number,
): Paginated<T> {
  if (Array.isArray(body)) {
    const start = (page - 1) * limit;
    return {
      items: body.slice(start, start + limit),
      total: body.length,
      page,
      limit,
    };
  }
  if (body && Array.isArray(body.items)) {
    return {
      items: body.items,
      total: typeof body.total === "number" ? body.total : body.items.length,
      page: typeof body.page === "number" ? body.page : page,
      limit: typeof body.limit === "number" ? body.limit : limit,
    };
  }
  return { items: [], total: 0, page, limit };
}

function entriesList(
  body: TimeEntry[] | Paginated<TimeEntry> | undefined,
): TimeEntry[] {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.items)) return body.items;
  return [];
}

export const api = {
  listEmployees: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<Paginated<Employee>> => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    const { data } = await request<Employee[] | Paginated<Employee>>(
      `/api/employees?${q}`,
    );
    return asPaginated(data, page, limit);
  },

  /** Page through employees for selects (API max limit is 50). */
  listAllEmployees: async (): Promise<Employee[]> => {
    const limit = 50;
    const all: Employee[] = [];
    let page = 1;
    for (;;) {
      const res = await api.listEmployees({ page, limit });
      all.push(...res.items);
      if (all.length >= res.total || res.items.length === 0) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  },

  getEmployee: (id: string) =>
    request<Employee>(`/api/employees/${id}`).then((r) => r.data),

  getEmployeeStats: (id: string, from: string, to: string) =>
    request<EmployeeStats>(
      `/api/employees/${id}/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ).then((r) => r.data),

  createEmployee: (input: EmployeeInput) =>
    request<Employee>("/api/employees", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data),

  updateEmployee: (id: string, input: Partial<EmployeeInput>) =>
    request<Employee>(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data),

  deleteEmployee: (id: string) =>
    request<{ ok: boolean }>(`/api/employees/${id}`, { method: "DELETE" }),

  listDepartments: async (): Promise<Department[]> => {
    try {
      const { data } = await request<Department[] | Paginated<Department>>(
        "/api/departments",
      );
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      return [];
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  },

  createDepartment: (name: string) =>
    request<Department>("/api/departments", {
      method: "POST",
      body: JSON.stringify({ name }),
    }).then((r) => r.data),

  updateDepartment: (id: string, name: string) =>
    request<Department>(`/api/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }).then((r) => r.data),

  deleteDepartment: (id: string) =>
    request<{ ok: boolean }>(`/api/departments/${id}`, { method: "DELETE" }),

  listActiveTimers: () =>
    request<ActiveTimer[]>("/api/timers/active").then((r) => r.data),

  startTimer: (input: { employeeId: string; description: string }) =>
    request<TimeEntry>("/api/timers/start", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data),

  stopTimer: (input: { employeeId?: string; timerId?: string }) =>
    request<TimeEntry>("/api/timers/stop", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data),

  listTimeEntries: async (params: {
    from: string;
    to: string;
    employeeId?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<TimeEntry>> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const q = new URLSearchParams();
    q.set("from", params.from);
    q.set("to", params.to);
    if (params.employeeId) q.set("employeeId", params.employeeId);
    if (params.q) q.set("q", params.q);
    q.set("page", String(page));
    q.set("limit", String(limit));
    const { data } = await request<TimeEntry[] | Paginated<TimeEntry>>(
      `/api/time-entries?${q}`,
    );
    if (Array.isArray(data)) {
      // Legacy unpaginated: filter client-side for q/employee when BE ignores them
      let items = data;
      if (params.employeeId) {
        items = items.filter((e) => e.employeeId === params.employeeId);
      }
      if (params.q) {
        const needle = params.q.toLowerCase();
        items = items.filter((e) =>
          e.description.toLowerCase().includes(needle),
        );
      }
      return asPaginated(items, page, limit);
    }
    return asPaginated(data, page, limit);
  },

  /** Calendar / report range fetch — returns flat list (no page UI). */
  listTimeEntriesRange: async (
    from: string,
    to: string,
    extra?: { employeeId?: string; q?: string },
  ): Promise<TimeEntry[]> => {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("to", to);
    if (extra?.employeeId) q.set("employeeId", extra.employeeId);
    if (extra?.q) q.set("q", extra.q);
    // Omit page/limit so API returns the full range array (calendar contract).
    // Sending limit>50 is rejected by DTO @Max(50) and yields empty calendar.
    const { data } = await request<TimeEntry[] | Paginated<TimeEntry>>(
      `/api/time-entries?${q}`,
    );
    return entriesList(data);
  },

  createTimeEntry: (input: {
    employeeId: string;
    description: string;
    start: string;
    stop?: string | null;
  }) =>
    request<TimeEntry>("/api/time-entries", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data),

  updateTimeEntry: (
    id: string,
    patch: Partial<{
      description: string;
      start: string;
      stop: string | null;
    }>,
  ) =>
    request<TimeEntry>(`/api/time-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then((r) => r.data),

  deleteTimeEntry: (id: string) =>
    request<{ ok: boolean }>(`/api/time-entries/${id}`, { method: "DELETE" }),

  getReportSummary: (from: string, to: string) =>
    request<ReportSummary>(
      `/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ).then((r) => r.data),

  getReportCharts: async (params: {
    from: string;
    to: string;
    bucket?: "day" | "week";
    breakdown?: "employees" | "departments";
  }): Promise<ReportCharts> => {
    const q = new URLSearchParams();
    q.set("from", params.from);
    q.set("to", params.to);
    if (params.bucket) q.set("bucket", params.bucket);
    if (params.breakdown) q.set("breakdown", params.breakdown);
    try {
      const { data } = await request<ReportCharts>(`/api/reports/charts?${q}`);
      return data ?? {};
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return {};
      throw err;
    }
  },

  exportReportCsv: async (from: string, to: string): Promise<Blob> => {
    const res = await fetch(
      `/api/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: { Accept: "text/csv" } },
    );
    if (!res.ok) {
      throw new ApiError(res.status, "CSV export failed");
    }
    return res.blob();
  },
};

export const queryKeys = {
  employees: (page?: number, limit?: number) =>
    ["employees", page ?? "all", limit ?? "default"] as const,
  employeesAll: ["employees", "all-pages"] as const,
  employee: (id: string) => ["employees", id] as const,
  employeeStats: (id: string, from: string, to: string) =>
    ["employees", id, "stats", from, to] as const,
  departments: ["departments"] as const,
  activeTimers: ["timers", "active"] as const,
  timeEntries: (params: Record<string, string | number | undefined>) =>
    ["time-entries", params] as const,
  reportSummary: (from: string, to: string) =>
    ["reports", "summary", from, to] as const,
  reportCharts: (from: string, to: string, bucket: string, breakdown: string) =>
    ["reports", "charts", from, to, bucket, breakdown] as const,
};

export function chartValue(row: ChartBucket): number {
  return row.totalDurationSeconds ?? row.total ?? row.value ?? 0;
}

export function chartLabel(row: ChartBucket, fallback = "—"): string {
  return row.label ?? row.name ?? row.key ?? row.date ?? fallback;
}

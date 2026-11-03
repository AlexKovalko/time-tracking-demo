export type Employee = { id: string; name: string };

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

export type ActiveTimer = {
  id: string;
  employeeId: string;
  description: string;
  start: string;
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

export const api = {
  listEmployees: () => request<Employee[]>("/api/employees").then((r) => r.data),

  createEmployee: (name: string) =>
    request<Employee>("/api/employees", {
      method: "POST",
      body: JSON.stringify({ name }),
    }).then((r) => r.data),

  updateEmployee: (id: string, name: string) =>
    request<Employee>(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }).then((r) => r.data),

  deleteEmployee: (id: string) =>
    request<{ ok: boolean }>(`/api/employees/${id}`, { method: "DELETE" }),

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

  listTimeEntries: (from: string, to: string) =>
    request<TimeEntry[]>(
      `/api/time-entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ).then((r) => r.data),

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
  employees: ["employees"] as const,
  activeTimers: ["timers", "active"] as const,
  timeEntries: (from: string, to: string) =>
    ["time-entries", from, to] as const,
  reportSummary: (from: string, to: string) =>
    ["reports", "summary", from, to] as const,
};

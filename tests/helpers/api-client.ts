import { API_BASE_URL } from "./env";

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
  id?: string;
  employeeId: string;
  description: string;
  start: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(`Empty body from ${res.url} (${res.status})`);
  }
  return JSON.parse(text) as T;
}

export async function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

export async function listEmployees(): Promise<Employee[]> {
  const res = await apiRequest("/employees");
  if (!res.ok) {
    throw new Error(`GET /employees → ${res.status}`);
  }
  return parseJson<Employee[]>(res);
}

export async function createEmployee(name: string): Promise<{
  status: number;
  body: Employee | unknown;
}> {
  const res = await apiRequest("/employees", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  const body = res.status === 204 ? null : await parseJson(res);
  return { status: res.status, body: body as Employee };
}

export async function patchEmployee(
  id: string,
  name: string,
): Promise<{ status: number; body: Employee | unknown }> {
  const res = await apiRequest(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  const body = await parseJson(res).catch(() => null);
  return { status: res.status, body };
}

export async function deleteEmployee(id: string): Promise<number> {
  const res = await apiRequest(`/employees/${id}`, { method: "DELETE" });
  return res.status;
}

export async function startTimer(input: {
  employeeId: string;
  description: string;
}): Promise<{ status: number; body: unknown }> {
  const res = await apiRequest("/timers/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const body = await parseJson(res).catch(() => null);
  return { status: res.status, body };
}

export async function stopTimer(input: {
  employeeId?: string;
  timerId?: string;
}): Promise<{ status: number; body: unknown }> {
  const res = await apiRequest("/timers/stop", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const body = await parseJson(res).catch(() => null);
  return { status: res.status, body };
}

export async function listActiveTimers(): Promise<ActiveTimer[]> {
  const res = await apiRequest("/timers/active");
  if (!res.ok) {
    throw new Error(`GET /timers/active → ${res.status}`);
  }
  return parseJson<ActiveTimer[]>(res);
}

export async function listTimeEntries(from: string, to: string): Promise<TimeEntry[]> {
  const res = await apiRequest(
    `/time-entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!res.ok) {
    throw new Error(`GET /time-entries → ${res.status}`);
  }
  return parseJson<TimeEntry[]>(res);
}

export async function createTimeEntry(body: {
  employeeId: string;
  description: string;
  start: string;
  stop?: string | null;
}): Promise<{ status: number; body: unknown }> {
  const res = await apiRequest("/time-entries", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const parsed = await parseJson(res).catch(() => null);
  return { status: res.status, body: parsed };
}

export async function patchTimeEntry(
  id: string,
  patch: Partial<{
    description: string;
    start: string;
    stop: string | null;
  }>,
): Promise<{ status: number; body: unknown }> {
  const res = await apiRequest(`/time-entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const parsed = await parseJson(res).catch(() => null);
  return { status: res.status, body: parsed };
}

export async function deleteTimeEntry(id: string): Promise<number> {
  const res = await apiRequest(`/time-entries/${id}`, { method: "DELETE" });
  return res.status;
}

export async function getReportSummary(
  from: string,
  to: string,
): Promise<{ status: number; body: ReportSummary | unknown }> {
  const res = await apiRequest(
    `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  const body = await parseJson(res).catch(() => null);
  return { status: res.status, body };
}

export async function exportReportCsv(
  from: string,
  to: string,
): Promise<{ status: number; contentType: string | null; text: string }> {
  const res = await apiRequest(
    `/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    text,
  };
}

/** Far-future empty window so seeded data does not interfere with empty-report asserts. */
export function emptyReportWindow(): { from: string; to: string } {
  return { from: "2099-01-01", to: "2099-01-02" };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

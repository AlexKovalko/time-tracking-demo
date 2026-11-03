import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PaginationBar } from "@/components/PaginationBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, queryKeys } from "@/lib/api";
import {
  formatDuration,
  formatInterval,
  todayIsoDate,
  toIsoDate,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function EmployeeProfile() {
  const { id = "" } = useParams<{ id: string }>();
  const { t, locale } = useI18n();

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return toIsoDate(d);
  }, []);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayIsoDate);
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({
    from: defaultFrom,
    to: todayIsoDate(),
    q: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const employeeQuery = useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: () => api.getEmployee(id),
    enabled: !!id,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.employeeStats(id, applied.from, applied.to),
    queryFn: () => api.getEmployeeStats(id, applied.from, applied.to),
    enabled: !!id,
    retry: false,
  });

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries({
      view: "profile",
      employeeId: id,
      from: applied.from,
      to: applied.to,
      q: applied.q,
      page,
      limit: pageSize,
    }),
    queryFn: () =>
      api.listTimeEntries({
        from: applied.from,
        to: applied.to,
        employeeId: id,
        q: applied.q || undefined,
        page,
        limit: pageSize,
      }),
    enabled: !!id,
  });

  const employee = employeeQuery.data;
  const entries = entriesQuery.data?.items ?? [];
  const total = entriesQuery.data?.total ?? 0;
  const isEmpty = !entriesQuery.isLoading && total === 0;

  // Fallback stats from entries page if /stats missing
  const fallbackDuration = entries.reduce(
    (sum, e) => sum + (e.durationSeconds ?? 0),
    0,
  );
  const stats = statsQuery.data;
  const totalDuration =
    stats?.totalDurationSeconds ??
    (statsQuery.isError ? fallbackDuration : undefined);
  const entryCount =
    stats?.entryCount ?? (statsQuery.isError ? total : undefined);

  function apply() {
    setApplied({ from, to, q: q.trim() });
    setPage(1);
  }

  const metaParts = [
    employee?.title,
    employee?.department?.name,
    employee?.email,
    employee?.phone,
  ].filter(Boolean);

  return (
    <section
      data-testid="employee-profile"
      aria-labelledby="employee-profile-name"
      className="flex flex-col gap-4"
    >
      <Link
        to="/employees"
        data-testid="employee-profile-back"
        className="w-fit text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {t("profile.back")}
      </Link>

      <header className="flex flex-col gap-1">
        <h1
          id="employee-profile-name"
          data-testid="employee-profile-name"
          className="text-xl font-semibold"
        >
          {employee?.name || t("employees.unnamed")}
        </h1>
        {metaParts.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-profile-filter-from">
            {t("entries.filter.from")}
          </Label>
          <Input
            id="employee-profile-filter-from"
            type="date"
            data-testid="employee-profile-filter-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-profile-filter-to">
            {t("entries.filter.to")}
          </Label>
          <Input
            id="employee-profile-filter-to"
            type="date"
            data-testid="employee-profile-filter-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="employee-profile-filter-q">
            {t("entries.filter.q")}
          </Label>
          <Input
            id="employee-profile-filter-q"
            data-testid="employee-profile-filter-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="button" onClick={apply}>
          {t("profile.apply")}
        </Button>
      </div>

      <div
        data-testid="employee-profile-stats"
        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
      >
        {totalDuration == null && entryCount == null ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("profile.stats.empty")}
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("profile.stats.totalDuration")}
              </p>
              <p className="text-lg tabular-nums">
                {formatDuration(totalDuration ?? 0, locale)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("profile.stats.entryCount")}
              </p>
              <p className="text-lg tabular-nums">{entryCount ?? total}</p>
            </div>
          </>
        )}
      </div>

      <div
        data-testid="employee-profile-entries"
        className="overflow-x-auto rounded-lg border"
      >
        {isEmpty ? (
          <p
            data-testid="employee-profile-empty"
            className="px-4 py-8 text-center text-muted-foreground"
          >
            {t("profile.entries.empty")}
          </p>
        ) : (
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.description")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.interval")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.duration")}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{entry.description}</td>
                  <td className="whitespace-pre-line px-3 py-2 text-muted-foreground">
                    {formatInterval(entry.start, entry.stop, locale)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {entry.stop == null
                      ? t("entries.running")
                      : formatDuration(entry.durationSeconds ?? 0, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationBar
        testId="employee-profile-pagination"
        page={page}
        limit={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}

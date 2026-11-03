import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { CompactBarChart } from "@/components/CompactBarChart";
import { PaginationBar } from "@/components/PaginationBar";
import { PieChart } from "@/components/PieChart";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { RowIconActions } from "@/components/RowIconActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  api,
  chartValue,
  queryKeys,
  type ChartBucket,
  type TimeEntry,
} from "@/lib/api";
import {
  endOfMonthIso,
  formatDuration,
  formatInterval,
  fromDatetimeLocalValue,
  startOfMonthIso,
  toDatetimeLocalValue,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function pickSeries(
  payload: Record<string, unknown> | undefined,
  keys: string[],
): ChartBucket[] {
  if (!payload) return [];
  for (const key of keys) {
    const val = payload[key];
    if (Array.isArray(val)) return val as ChartBucket[];
  }
  return [];
}

function currentMonthRange() {
  return { from: startOfMonthIso(), to: endOfMonthIso() };
}

export function ReportSection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const initialRange = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [applied, setApplied] = useState(initialRange);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bucket, setBucket] = useState<"day" | "week">("day");
  const [breakdown, setBreakdown] = useState<"employees" | "departments">(
    "employees",
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editStop, setEditStop] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const deleteEntryRef = useRef<TimeEntry | null>(null);
  deleteEntryRef.current = deleteEntry;

  const invalidRange = applied.from > applied.to;

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries({
      view: "report",
      from: applied.from,
      to: applied.to,
      page,
      limit: pageSize,
    }),
    queryFn: () =>
      api.listTimeEntries({
        from: applied.from,
        to: applied.to,
        page,
        limit: pageSize,
      }),
    enabled: !invalidRange,
  });

  const chartsQuery = useQuery({
    queryKey: queryKeys.reportCharts(
      applied.from,
      applied.to,
      bucket,
      breakdown,
    ),
    queryFn: () =>
      api.getReportCharts({
        from: applied.from,
        to: applied.to,
        bucket,
        breakdown,
      }),
    enabled: !invalidRange,
  });

  const entries = entriesQuery.data?.items ?? [];
  const entriesTotal = entriesQuery.data?.total ?? 0;
  const entriesLoading =
    entriesQuery.isPending || (entriesQuery.isFetching && entries.length === 0);
  const entriesRefreshing = entriesQuery.isFetching && entries.length > 0;
  const isEmpty =
    !invalidRange && entriesQuery.isSuccess && !entriesQuery.isFetching
      ? entriesTotal === 0
      : false;

  const chartsPayload = chartsQuery.data as Record<string, unknown> | undefined;
  const overTime = pickSeries(chartsPayload, [
    "overTime",
    "series",
    "buckets",
  ]);
  const breakdownSeries = pickSeries(chartsPayload, [
    "breakdown",
    "items",
    "series",
  ]);

  // Charts come from the reports API — do not rebuild from a paginated entries page.
  const clientOverTime = overTime;
  const clientBreakdown = breakdownSeries;

  const chartsEmpty =
    !chartsQuery.isLoading &&
    !chartsQuery.isFetching &&
    clientOverTime.every((r) => chartValue(r) === 0) &&
    clientBreakdown.every((r) => chartValue(r) === 0);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editEntry) throw new Error("No entry");
      const patch: {
        description: string;
        start: string;
        stop?: string | null;
      } = {
        description: editDescription.trim(),
        start: fromDatetimeLocalValue(editStart),
      };
      if (editEntry.stop !== null) {
        patch.stop = editStop
          ? fromDatetimeLocalValue(editStop)
          : editEntry.stop;
      }
      return api.updateTimeEntry(editEntry.id, patch);
    },
    onSuccess: async () => {
      setEditEntry(null);
      setEditError(null);
      await invalidateReport();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setEditError(t("entries.errors.conflictRunning"));
        return;
      }
      setEditError(t("entries.errors.saveFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTimeEntry(id),
    onSuccess: async () => {
      setDeleteEntry(null);
      await invalidateReport();
    },
  });

  useEffect(() => {
    if (!deleteEntry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const id = deleteEntryRef.current?.id;
      if (!id) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setDeleteEntry(null);
      deleteMutation.mutate(id);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteEntry]);

  async function invalidateReport() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTimers }),
    ]);
  }

  function applyPeriod() {
    if (from > to) {
      setRangeError(t("report.errors.invalidRange"));
      return;
    }
    setRangeError(null);
    setPage(1);
    setApplied({ from, to });
  }

  async function onExport() {
    setExportError(null);
    setExporting(true);
    try {
      const blob = await api.exportReportCsv(applied.from, applied.to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-report-${applied.from}_${applied.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("report.export.failed"));
    } finally {
      setExporting(false);
    }
  }

  function openEdit(entry: TimeEntry) {
    setEditEntry(entry);
    setEditDescription(entry.description);
    setEditStart(toDatetimeLocalValue(entry.start));
    setEditStop(entry.stop ? toDatetimeLocalValue(entry.stop) : "");
    setEditError(null);
  }

  return (
    <section
      id="report"
      aria-labelledby="report-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="report-heading" className="text-xl font-semibold">
          {t("report.title")}
        </h1>
        <Button
          type="button"
          data-testid="report-export-button"
          variant="outline"
          disabled={isEmpty || exporting || invalidRange || entriesLoading}
          title={isEmpty ? t("report.export.disabledEmpty") : undefined}
          onClick={onExport}
        >
          {t("report.export")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-from">{t("report.fromLabel")}</Label>
          <Input
            id="report-from"
            type="date"
            data-testid="report-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-to">{t("report.toLabel")}</Label>
          <Input
            id="report-to"
            type="date"
            data-testid="report-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button
          type="button"
          data-testid="report-apply"
          onClick={applyPeriod}
        >
          {t("report.apply")}
        </Button>
      </div>

      {rangeError ? (
        <p className="text-sm text-destructive" role="alert">
          {rangeError}
        </p>
      ) : null}
      {exportError ? (
        <p className="text-sm text-destructive" role="alert">
          {exportError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">{t("charts.overTime.title")}</h2>
          <div className="flex gap-1" role="group">
            <Button
              type="button"
              size="sm"
              variant={bucket === "day" ? "default" : "outline"}
              data-testid="report-chart-over-time-day"
              aria-pressed={bucket === "day"}
              onClick={() => setBucket("day")}
            >
              {t("charts.overTime.day")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={bucket === "week" ? "default" : "outline"}
              data-testid="report-chart-over-time-week"
              aria-pressed={bucket === "week"}
              onClick={() => setBucket("week")}
            >
              {t("charts.overTime.week")}
            </Button>
          </div>
        </div>
        {chartsEmpty ? (
          <div
            data-testid="report-chart-over-time"
            data-chart-layout="compact"
            role="region"
            aria-label={t("charts.a11y.overTime")}
            className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
          >
            <p data-testid="report-chart-empty">{t("charts.empty")}</p>
          </div>
        ) : (
          <CompactBarChart
            testId="report-chart-over-time"
            data={clientOverTime}
            bucket={bucket}
            emptyLabel={t("charts.empty")}
            emptyTestId="report-chart-empty"
            ariaLabel={t("charts.a11y.overTime")}
            unassignedLabel={t("charts.unassigned")}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">{t("charts.breakdown.title")}</h2>
          <div className="flex gap-1" role="group">
            <Button
              type="button"
              size="sm"
              variant={breakdown === "employees" ? "default" : "outline"}
              data-testid="report-chart-breakdown-employees"
              aria-pressed={breakdown === "employees"}
              onClick={() => setBreakdown("employees")}
            >
              {t("charts.breakdown.employees")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={breakdown === "departments" ? "default" : "outline"}
              data-testid="report-chart-breakdown-departments"
              aria-pressed={breakdown === "departments"}
              onClick={() => setBreakdown("departments")}
            >
              {t("charts.breakdown.departments")}
            </Button>
          </div>
        </div>
        <PieChart
          testId="report-chart-breakdown"
          data={chartsEmpty ? [] : clientBreakdown}
          emptyLabel={t("charts.empty")}
          ariaLabel={t("charts.a11y.breakdown")}
          unassignedLabel={t("charts.unassigned")}
          variant="donut"
          totalCaption={t("charts.breakdown.totalHours")}
        />
      </div>

      {isEmpty ? (
        <p
          data-testid="report-empty"
          className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground"
        >
          {t("report.empty")}
        </p>
      ) : null}

      <div
        data-testid="report-entries"
        aria-busy={entriesLoading || entriesRefreshing}
        className={`overflow-x-auto rounded-lg border ${entriesRefreshing ? "opacity-60" : ""}`}
      >
        {entriesLoading ? (
          <p
            data-testid="report-entries-loading"
            className="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            {t("common.loading")}
          </p>
        ) : entries.length > 0 ? (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.employee")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.description")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.interval")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.duration")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  data-testid={`entry-row-${entry.id}`}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2">
                    {entry.employeeName ?? entry.employeeId}
                  </td>
                  <td className="px-3 py-2">{entry.description}</td>
                  <td className="whitespace-pre-line px-3 py-2 text-muted-foreground">
                    {formatInterval(entry.start, entry.stop, locale)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {entry.stop == null
                      ? "…"
                      : formatDuration(entry.durationSeconds ?? 0, locale)}
                  </td>
                  <td className="px-3 py-2">
                    <RowIconActions
                      editLabel={t("entries.edit")}
                      deleteLabel={t("entries.delete")}
                      onEdit={() => openEdit(entry)}
                      onDelete={() => setDeleteEntry(entry)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {!invalidRange && entriesTotal > 0 ? (
        <PaginationBar
          testId="report-pagination"
          page={page}
          limit={pageSize}
          total={entriesTotal}
          onPageChange={setPage}
          onLimitChange={(limit) => {
            setPageSize(limit);
            setPage(1);
          }}
        />
      ) : null}

      <Dialog
        open={!!editEntry}
        onOpenChange={(open) => {
          if (!open) setEditEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("entries.edit")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-edit-description">
                {t("report.columns.description")}
              </Label>
              <Input
                id="entry-edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-edit-start">
                {t("report.columns.interval")}
              </Label>
              <Input
                id="entry-edit-start"
                type="datetime-local"
                step="1"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                disabled={editEntry?.stop == null}
              />
              {editEntry?.stop != null ? (
                <Input
                  type="datetime-local"
                  step="1"
                  value={editStop}
                  onChange={(e) => setEditStop(e.target.value)}
                />
              ) : null}
            </div>
            {editError ? (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditEntry(null)}
            >
              {t("entries.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {t("entries.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteEntry}
        onOpenChange={(open) => {
          if (!open) setDeleteEntry(null);
        }}
      >
        <DialogContent
          data-testid="entries-delete-dialog"
          role="alertdialog"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{t("entries.deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("entries.deleteConfirmBody")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteEntry(null)}
            >
              {t("entries.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="entries-delete-confirm"
              autoFocus
              disabled={deleteMutation.isPending}
              onClick={() => {
                const id = deleteEntryRef.current?.id ?? deleteEntry?.id;
                if (!id) return;
                setDeleteEntry(null);
                deleteMutation.mutate(id);
              }}
            >
              <Trash2Icon data-icon="trash" className="size-4" />
              {t("entries.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ApiError,
  api,
  queryKeys,
  type TimeEntry,
} from "@/lib/api";
import {
  formatDuration,
  formatInterval,
  fromDatetimeLocalValue,
  todayIsoDate,
  toDatetimeLocalValue,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function ReportSection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(todayIsoDate);
  const [to, setTo] = useState(todayIsoDate);
  const [applied, setApplied] = useState({ from: todayIsoDate(), to: todayIsoDate() });
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editStop, setEditStop] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);

  const invalidRange = applied.from > applied.to;

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries(applied.from, applied.to),
    queryFn: () => api.listTimeEntries(applied.from, applied.to),
    enabled: !invalidRange,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.reportSummary(applied.from, applied.to),
    queryFn: () => api.getReportSummary(applied.from, applied.to),
    enabled: !invalidRange,
  });

  const entries = entriesQuery.data ?? [];
  const summary = summaryQuery.data;
  const isEmpty = !invalidRange && !entriesQuery.isLoading && entries.length === 0;

  const intlLocale = locale === "ru" ? "ru-RU" : "en-US";

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

  const totalsRows = useMemo(() => summary?.employees ?? [], [summary]);

  return (
    <section id="report" aria-labelledby="report-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="report-heading" className="text-xl font-semibold">
          {t("report.title")}
        </h1>
        <Button
          type="button"
          data-testid="report-export-button"
          variant="outline"
          disabled={isEmpty || exporting || invalidRange}
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
        <Button type="button" onClick={applyPeriod}>
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

      <div data-testid="report-totals" className="rounded-lg border p-4">
        <h3 className="mb-2 font-medium">{t("report.totals.title")}</h3>
        {totalsRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {formatDuration(0)} — {t("report.totals.grand")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {totalsRows.map((row) => (
              <li key={row.employeeId} className="flex justify-between gap-4">
                <span>{row.name}</span>
                <span className="font-mono tabular-nums">
                  {formatDuration(row.totalDurationSeconds)}
                </span>
              </li>
            ))}
            <li className="mt-2 flex justify-between gap-4 border-t pt-2 font-medium">
              <span>{t("report.totals.grand")}</span>
              <span className="font-mono tabular-nums">
                {formatDuration(summary?.grandTotalSeconds ?? 0)}
              </span>
            </li>
          </ul>
        )}
      </div>

      {isEmpty ? (
        <p
          data-testid="report-empty"
          className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground"
        >
          {t("report.empty")}
        </p>
      ) : null}

      <div data-testid="report-entries" className="overflow-x-auto rounded-lg border">
        {entries.length > 0 ? (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">{t("report.columns.employee")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("report.columns.description")}
                </th>
                <th className="px-3 py-2 font-medium">{t("report.columns.interval")}</th>
                <th className="px-3 py-2 font-medium">{t("report.columns.duration")}</th>
                <th className="px-3 py-2 font-medium">{t("report.columns.actions")}</th>
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
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatInterval(entry.start, entry.stop, intlLocale)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">
                    {entry.stop == null
                      ? "…"
                      : formatDuration(entry.durationSeconds ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(entry)}
                      >
                        {t("entries.edit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteEntry(entry)}
                      >
                        {t("entries.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

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
              <Label htmlFor="entry-edit-start">{t("report.columns.interval")}</Label>
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
            <Button type="button" variant="outline" onClick={() => setEditEntry(null)}>
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

      <AlertDialog
        open={!!deleteEntry}
        onOpenChange={(open) => {
          if (!open) setDeleteEntry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("entries.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("entries.deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("entries.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                const id = deleteEntry?.id;
                if (!id) return;
                deleteMutation.mutate(id);
              }}
            >
              {t("entries.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  addDays,
  formatDuration,
  formatInterval,
  formatWeekPeriodLabel,
  fromDatetimeLocalValue,
  localIsoDateFromTimestamp,
  startOfIsoWeek,
  toDatetimeLocalValue,
  toIsoDate,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";

export function EntriesSection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const intlLocale = locale === "ru" ? "ru-RU" : "en-US";

  const [view, setView] = useState<ViewMode>("list");
  const [weekStart, setWeekStart] = useState(() => startOfIsoWeek());
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createStop, setCreateStop] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editStop, setEditStop] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const from = toIsoDate(weekStart);
  const to = toIsoDate(weekEnd);
  const periodLabel = formatWeekPeriodLabel(weekStart, intlLocale);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: api.listEmployees,
  });
  const employees = employeesQuery.data ?? [];

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries(from, to),
    queryFn: () => api.listTimeEntries(from, to),
  });
  const entries = entriesQuery.data ?? [];
  const isEmpty = !entriesQuery.isLoading && entries.length === 0;

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const day of weekDays) {
      map.set(toIsoDate(day), []);
    }
    for (const entry of entries) {
      const key = localIsoDateFromTimestamp(entry.start);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(entry);
      }
    }
    return map;
  }, [entries, weekDays]);

  async function invalidateEntries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTimers }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createTimeEntry({
        employeeId: createEmployeeId,
        description: createDescription.trim(),
        start: fromDatetimeLocalValue(createStart),
        stop: createStop ? fromDatetimeLocalValue(createStop) : null,
      }),
    onSuccess: async () => {
      setCreateOpen(false);
      setCreateError(null);
      await invalidateEntries();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setCreateError(t("entries.errors.conflictRunning"));
        return;
      }
      setCreateError(t("entries.errors.saveFailed"));
    },
  });

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
      await invalidateEntries();
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
      await invalidateEntries();
    },
  });

  function openCreate() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setCreateEmployeeId(employees[0]?.id ?? "");
    setCreateDescription("");
    setCreateStart(toDatetimeLocalValue(hourAgo.toISOString()));
    setCreateStop(toDatetimeLocalValue(now.toISOString()));
    setCreateError(null);
    setCreateOpen(true);
  }

  function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmployeeId) {
      setCreateError(t("entries.errors.employeeRequired"));
      return;
    }
    if (!createDescription.trim()) {
      setCreateError(t("entries.errors.descriptionRequired"));
      return;
    }
    if (!createStart) {
      setCreateError(t("entries.errors.startRequired"));
      return;
    }
    setCreateError(null);
    createMutation.mutate();
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
      id="entries"
      aria-labelledby="entries-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="entries-heading" className="text-xl font-semibold">
          {t("entries.title")}
        </h1>
        {view === "list" ? (
          <Button
            type="button"
            data-testid="entries-add-open"
            onClick={openCreate}
          >
            {t("entries.addOpen")}
          </Button>
        ) : null}
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t("entries.view.aria")}
      >
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          data-testid="entries-view-list"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          {t("entries.view.list")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "calendar" ? "default" : "outline"}
          data-testid="entries-view-calendar"
          aria-pressed={view === "calendar"}
          onClick={() => setView("calendar")}
        >
          {t("entries.view.calendar")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="entries-week-prev"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
        >
          {t("entries.week.prev")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="entries-week-current"
          onClick={() => setWeekStart(startOfIsoWeek())}
        >
          {t("entries.week.current")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="entries-week-next"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
        >
          {t("entries.week.next")}
        </Button>
        <p
          data-testid="entries-period-label"
          className="text-sm text-muted-foreground"
          aria-label={t("entries.periodLabel")}
        >
          {periodLabel}
        </p>
      </div>

      {view === "list" ? (
        <div data-testid="entries-list" className="overflow-x-auto rounded-lg border">
          {isEmpty ? (
            <p
              data-testid="entries-empty"
              className="px-4 py-8 text-center text-muted-foreground"
            >
              {t("entries.empty")}
            </p>
          ) : (
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
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatInterval(entry.start, entry.stop, intlLocale)}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {entry.stop == null
                        ? t("entries.running")
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
          )}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div data-testid="entries-calendar" className="flex flex-col gap-3">
          {isEmpty ? (
            <p
              data-testid="entries-empty"
              className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground"
            >
              {t("entries.calendar.empty")}
            </p>
          ) : null}
          <div className="grid min-w-0 grid-cols-7 gap-2 overflow-x-auto">
            {weekDays.map((day) => {
              const dayKey = toIsoDate(day);
              const dayEntries = entriesByDay.get(dayKey) ?? [];
              const weekday = day.toLocaleDateString(intlLocale, {
                weekday: "short",
              });
              return (
                <div
                  key={dayKey}
                  data-day={dayKey}
                  data-testid={`entries-day-${dayKey}`}
                  className="flex min-h-36 min-w-[5.5rem] flex-col gap-2 rounded-lg border bg-muted/20 p-2"
                >
                  <div className="border-b pb-1 text-center text-xs font-medium">
                    <div>{weekday}</div>
                    <div className="text-muted-foreground">{day.getDate()}</div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                    {dayEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        title={entry.description}
                        className={cn(
                          "rounded-md border bg-background px-1.5 py-1 text-left text-[11px] leading-snug hover:bg-muted",
                        )}
                        onClick={() => openEdit(entry)}
                      >
                        <div className="truncate font-medium">
                          {entry.employeeName ?? entry.employeeId}
                        </div>
                        <div className="truncate text-muted-foreground">
                          {entry.description}
                        </div>
                        <div className="font-mono tabular-nums">
                          {entry.stop == null
                            ? t("entries.running")
                            : formatDuration(entry.durationSeconds ?? 0)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) setCreateOpen(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("entries.createTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreateSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t("entries.employeeLabel")}</Label>
                <Select
                  value={createEmployeeId || undefined}
                  onValueChange={(value) => setCreateEmployeeId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("timer.employeePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-create-description">
                  {t("entries.descriptionLabel")}
                </Label>
                <Input
                  id="entry-create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-create-start">{t("entries.startLabel")}</Label>
                <Input
                  id="entry-create-start"
                  type="datetime-local"
                  step="1"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-create-stop">{t("entries.stopLabel")}</Label>
                <Input
                  id="entry-create-stop"
                  type="datetime-local"
                  step="1"
                  value={createStop}
                  onChange={(e) => setCreateStop(e.target.value)}
                />
              </div>
              {createError ? (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("entries.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {t("entries.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {editEntry ? (
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
                  {t("entries.descriptionLabel")}
                </Label>
                <Input
                  id="entry-edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-edit-start">{t("entries.startLabel")}</Label>
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
      ) : null}

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

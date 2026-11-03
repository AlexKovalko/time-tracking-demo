import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { RowIconActions } from "@/components/RowIconActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmployeeCombobox } from "@/components/EmployeeCombobox";
import { PaginationBar } from "@/components/PaginationBar";
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
import { ApiError, api, queryKeys, type TimeEntry } from "@/lib/api";
import {
  addDays,
  formatDayPeriodLabel,
  formatDuration,
  formatInterval,
  formatWeekPeriodLabel,
  fromDatetimeLocalValue,
  localIsoDateFromTimestamp,
  snapMinutes,
  startOfIsoWeek,
  toDatetimeLocalValue,
  toIsoDate,
} from "@/lib/format";
import { colorForKey } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";
type CalendarMode = "week" | "day";

const HOUR_HEIGHT = 48;
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i,
);
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function yToDate(day: Date, clientY: number, top: number): Date {
  const ratio = Math.max(0, Math.min(1, (clientY - top) / GRID_HEIGHT));
  const totalMinutes = ratio * (HOURS.length * 60);
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  result.setMinutes(Math.round(totalMinutes));
  return snapMinutes(result, 15);
}


type OverlapLayout = { column: number; columns: number };

/** Assign side-by-side columns for overlapping entries (AC-38). */
function computeOverlapLayout(entries: TimeEntry[]): Map<string, OverlapLayout> {
  const items = entries
    .map((e) => ({
      id: e.id,
      start: new Date(e.start).getTime(),
      end: e.stop ? new Date(e.stop).getTime() : Date.now(),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = new Map<string, OverlapLayout>();
  let cluster: typeof items = [];
  let clusterEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const assignments: Array<{ id: string; col: number }> = [];
    for (const item of cluster) {
      let col = colEnds.findIndex((end) => end <= item.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(item.end);
      } else {
        colEnds[col] = item.end;
      }
      assignments.push({ id: item.id, col });
    }
    const columns = Math.max(1, colEnds.length);
    for (const a of assignments) {
      result.set(a.id, { column: a.col, columns });
    }
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length === 0) {
      cluster = [item];
      clusterEnd = item.end;
      continue;
    }
    if (item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      flush();
      cluster = [item];
      clusterEnd = item.end;
    }
  }
  flush();
  return result;
}

export function EntriesSection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const intlLocale = locale === "ru" ? "ru-RU" : "en-US";

  const [view, setView] = useState<ViewMode>("list");
  const [calMode, setCalMode] = useState<CalendarMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filterEmployeeId, setFilterEmployeeId] = useState("all");
  const [filterFrom, setFilterFrom] = useState(() =>
    toIsoDate(startOfIsoWeek()),
  );
  const [filterTo, setFilterTo] = useState(() =>
    toIsoDate(addDays(startOfIsoWeek(), 6)),
  );
  const [filterQ, setFilterQ] = useState("");
  const [applied, setApplied] = useState({
    employeeId: "all",
    from: toIsoDate(startOfIsoWeek()),
    to: toIsoDate(addDays(startOfIsoWeek(), 6)),
    q: "",
  });

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
  const deleteEntryRef = useRef<TimeEntry | null>(null);
  deleteEntryRef.current = deleteEntry;

  const dragRef = useRef<{
    day: Date;
    startY: number;
    currentY: number;
    top: number;
  } | null>(null);
  const [dragOverlay, setDragOverlay] = useState<{
    dayKey: string;
    top: number;
    height: number;
  } | null>(null);

  const weekStart = useMemo(
    () => startOfIsoWeek(anchorDate),
    [anchorDate],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const visibleDays = calMode === "week" ? weekDays : [anchorDate];

  const calFrom = toIsoDate(visibleDays[0]);
  const calTo = toIsoDate(visibleDays[visibleDays.length - 1]);
  const periodLabel =
    calMode === "week"
      ? formatWeekPeriodLabel(weekStart, intlLocale)
      : formatDayPeriodLabel(anchorDate, intlLocale);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employeesAll,
    queryFn: api.listAllEmployees,
  });
  const employees = employeesQuery.data ?? [];

  const listQuery = useQuery({
    queryKey: queryKeys.timeEntries({
      view: "list",
      from: applied.from,
      to: applied.to,
      employeeId: applied.employeeId,
      q: applied.q,
      page,
      limit: pageSize,
    }),
    queryFn: () =>
      api.listTimeEntries({
        from: applied.from,
        to: applied.to,
        employeeId:
          applied.employeeId === "all" ? undefined : applied.employeeId,
        q: applied.q || undefined,
        page,
        limit: pageSize,
      }),
    enabled: view === "list",
  });

  const calQuery = useQuery({
    queryKey: queryKeys.timeEntries({
      view: "calendar",
      from: calFrom,
      to: calTo,
      employeeId: applied.employeeId,
      q: applied.q,
    }),
    queryFn: () =>
      api.listTimeEntriesRange(calFrom, calTo, {
        employeeId:
          applied.employeeId === "all" ? undefined : applied.employeeId,
        q: applied.q || undefined,
      }),
    enabled: view === "calendar",
  });

  const listEntries = listQuery.data?.items ?? [];
  const listTotal = listQuery.data?.total ?? 0;
  const calEntries = calQuery.data ?? [];
  const listEmpty = view === "list" && !listQuery.isLoading && listTotal === 0;
  const calEmpty =
    view === "calendar" && !calQuery.isLoading && calEntries.length === 0;



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





  function applyFilters() {
    setApplied({
      employeeId: filterEmployeeId,
      from: filterFrom,
      to: filterTo,
      q: filterQ.trim(),
    });
    setPage(1);
  }

  function clearFilters() {
    const from = toIsoDate(startOfIsoWeek());
    const to = toIsoDate(addDays(startOfIsoWeek(), 6));
    setFilterEmployeeId("all");
    setFilterFrom(from);
    setFilterTo(to);
    setFilterQ("");
    setApplied({ employeeId: "all", from, to, q: "" });
    setPage(1);
  }

  function syncPeriodFromCalendar() {
    setFilterFrom(calFrom);
    setFilterTo(calTo);
    setApplied((prev) => ({ ...prev, from: calFrom, to: calTo }));
  }

  function shiftPeriod(dir: -1 | 1) {
    if (calMode === "week") {
      setAnchorDate((d) => addDays(startOfIsoWeek(d), dir * 7));
    } else {
      setAnchorDate((d) => addDays(d, dir));
    }
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  function openCreate(prefill?: { start: Date; stop: Date }) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const start = prefill?.start ?? hourAgo;
    const stop = prefill?.stop ?? now;
    // Keep employee empty so required validation stays meaningful (AC-5).
    setCreateEmployeeId("");
    setCreateDescription("");
    setCreateStart(toDatetimeLocalValue(start.toISOString()));
    setCreateStop(toDatetimeLocalValue(stop.toISOString()));
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

  const onGridPointerDown = useCallback(
    (day: Date, e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-entry-block]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      dragRef.current = {
        day,
        startY: e.clientY,
        currentY: e.clientY,
        top: rect.top,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      const y1 = e.clientY - rect.top;
      setDragOverlay({
        dayKey: toIsoDate(day),
        top: y1,
        height: 4,
      });
    },
    [],
  );

  const onGridPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.currentY = e.clientY;
      const a = drag.startY - drag.top;
      const b = drag.currentY - drag.top;
      const top = Math.max(0, Math.min(a, b));
      const height = Math.max(4, Math.abs(a - b));
      setDragOverlay({
        dayKey: toIsoDate(drag.day),
        top,
        height,
      });
    },
    [],
  );

  const onGridPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragOverlay(null);
      if (!drag) return;
      const start = yToDate(
        drag.day,
        Math.min(drag.startY, drag.currentY),
        drag.top,
      );
      let end = yToDate(
        drag.day,
        Math.max(drag.startY, drag.currentY),
        drag.top,
      );
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      // Tiny click without drag → 1h slot
      if (Math.abs(drag.currentY - drag.startY) < 8) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      openCreate({ start, stop: end });
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees],
  );

  function blockStyle(
    entry: TimeEntry,
    day: Date,
    layout?: OverlapLayout,
  ): React.CSSProperties {
    const start = new Date(entry.start);
    const end = entry.stop
      ? new Date(entry.stop)
      : new Date(Date.now());
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const clippedStart = start < dayStart ? dayStart : start;
    const clippedEnd = end > dayEnd ? dayEnd : end;
    const top =
      ((minutesFromMidnight(clippedStart) - DAY_START_HOUR * 60) / 60) *
      HOUR_HEIGHT;
    const height = Math.max(
      16,
      ((clippedEnd.getTime() - clippedStart.getTime()) / 3_600_000) *
        HOUR_HEIGHT,
    );
    const columns = layout?.columns ?? 1;
    const column = layout?.column ?? 0;
    const gapPct = 1;
    const widthPct = (100 - gapPct * (columns + 1)) / columns;
    const leftPct = gapPct + column * (widthPct + gapPct);
    const fill = colorForKey(entry.employeeId);
    return {
      top,
      height,
      left: `${leftPct}%`,
      width: `${widthPct}%`,
      right: "auto",
      backgroundColor: fill,
      borderColor: fill,
      color: "var(--foreground)",
      opacity: 0.92,
    };
  }

  return (
    <section
      id="entries"
      aria-labelledby="entries-heading"
      className="flex w-full flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="entries-heading" className="text-xl font-semibold">
          {t("entries.title")}
        </h1>
        <Button
          type="button"
          data-testid="entries-add-open"
          onClick={() => openCreate()}
        >
          {t("entries.addOpen")}
        </Button>
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
          onClick={() => {
            setView("calendar");
            syncPeriodFromCalendar();
          }}
        >
          {t("entries.view.calendar")}
        </Button>
      </div>

      {view === "calendar" ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1"
            role="group"
            aria-label={t("entries.mode.aria")}
          >
            <Button
              type="button"
              size="sm"
              variant={calMode === "week" ? "default" : "outline"}
              data-testid="entries-mode-week"
              aria-pressed={calMode === "week"}
              onClick={() => setCalMode("week")}
            >
              {t("entries.mode.week")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={calMode === "day" ? "default" : "outline"}
              data-testid="entries-mode-day"
              aria-pressed={calMode === "day"}
              onClick={() => setCalMode("day")}
            >
              {t("entries.mode.day")}
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="entries-period-prev"
            aria-label={t("entries.period.prev")}
            onClick={() => shiftPeriod(-1)}
          >
            ←
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="entries-period-today"
            onClick={goToday}
          >
            {t("entries.period.today")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="entries-period-next"
            aria-label={t("entries.period.next")}
            onClick={() => shiftPeriod(1)}
          >
            →
          </Button>
          {/* Legacy aliases for older E2E helpers */}
          <span className="sr-only">
            <button
              type="button"
              data-testid="entries-week-prev"
              onClick={() => shiftPeriod(-1)}
            />
            <button
              type="button"
              data-testid="entries-week-next"
              onClick={() => shiftPeriod(1)}
            />
            <button
              type="button"
              data-testid="entries-week-current"
              onClick={goToday}
            />
          </span>
          <p
            data-testid="entries-period-label"
            className="text-sm text-muted-foreground"
          >
            {periodLabel}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div className="flex min-w-[10rem] flex-col gap-1.5">
          <Label>{t("entries.filter.employee")}</Label>
          <EmployeeCombobox
            testIdPrefix="entries-filter-employee"
            inputTestId="entries-filter-employee-input"
            listTestId="entries-filter-employee-list"
            clearTestId="entries-filter-employee-clear"
            employees={employees}
            value={filterEmployeeId}
            onValueChange={(v) => setFilterEmployeeId(v || "all")}
            allowAll
            isLoading={employeesQuery.isLoading}
          />
        </div>
        {view === "list" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entries-filter-from">
                {t("entries.filter.from")}
              </Label>
              <Input
                id="entries-filter-from"
                type="date"
                data-testid="entries-filter-from"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entries-filter-to">
                {t("entries.filter.to")}
              </Label>
              <Input
                id="entries-filter-to"
                type="date"
                data-testid="entries-filter-to"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="entries-filter-q">{t("entries.filter.q")}</Label>
          <Input
            id="entries-filter-q"
            data-testid="entries-filter-q"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
          />
        </div>
        <Button
          type="button"
          data-testid="entries-filter-apply"
          onClick={applyFilters}
        >
          {t("entries.filter.apply")}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="entries-filter-clear"
          onClick={clearFilters}
        >
          {t("entries.filter.clear")}
        </Button>
      </div>

      {view === "list" ? (
        <>
          <div
            data-testid="entries-list"
            className="overflow-x-auto rounded-lg border"
          >
            {listEmpty ? (
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
                  {listEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      data-testid={`entry-row-${entry.id}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-2">
                        {entry.employeeName ??
                          employees.find((e) => e.id === entry.employeeId)
                            ?.name ??
                          t("employees.unnamed")}
                      </td>
                      <td className="px-3 py-2">{entry.description}</td>
                      <td
                        className="whitespace-pre-line px-3 py-2 text-muted-foreground"
                        data-testid={`entry-interval-${entry.id}`}
                      >
                        {formatInterval(entry.start, entry.stop, locale)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {entry.stop == null
                          ? t("entries.running")
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
            )}
          </div>
          <PaginationBar
            testId="entries-pagination"
            page={page}
            limit={pageSize}
            total={listTotal}
            onPageChange={setPage}
            onLimitChange={(limit) => {
              setPageSize(limit);
              setPage(1);
            }}
          />
        </>
      ) : null}

      {view === "calendar" ? (
        <div
          data-testid="entries-calendar"
          className="flex w-full min-w-0 flex-col gap-2 overflow-x-auto"
        >
          {calEmpty ? (
            <p
              data-testid="entries-empty"
              className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground"
            >
              {t("entries.calendar.empty")}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("entries.dragCreate.hint")}
          </p>
          <div
            className={cn(
              "grid min-w-0 gap-0 border-t",
              calMode === "week"
                ? "grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
                : "grid-cols-[3.5rem_minmax(0,1fr)]",
            )}
          >
            <div className="border-b border-r" />
            {visibleDays.map((day) => (
              <div
                key={toIsoDate(day)}
                className="border-b border-r px-1 py-2 text-center text-xs font-medium"
              >
                <div>
                  {day.toLocaleDateString(intlLocale, { weekday: "short" })}
                </div>
                <div className="text-muted-foreground">{day.getDate()}</div>
              </div>
            ))}

            <div
              data-testid="entries-hour-axis"
              className="hour-axis relative border-r"
              style={{ height: GRID_HEIGHT }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  data-hour={hour}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                >
                  {`${String(hour).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {visibleDays.map((day) => {
              const dayKey = toIsoDate(day);
              const dayEntries = calEntries.filter(
                (e) => localIsoDateFromTimestamp(e.start) === dayKey,
              );
              const overlap = computeOverlapLayout(dayEntries);
              return (
                <div
                  key={dayKey}
                  data-day={dayKey}
                  data-testid={`entries-day-${dayKey}`}
                  className="relative touch-none border-r border-b select-none"
                  style={{ height: GRID_HEIGHT }}
                  onPointerDown={(e) => onGridPointerDown(day, e)}
                  onPointerMove={onGridPointerMove}
                  onPointerUp={onGridPointerUp}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                      style={{
                        top: (hour - DAY_START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                    />
                  ))}
                  {dragOverlay?.dayKey === dayKey ? (
                    <div
                      data-testid="entries-drag-select"
                      className="pointer-events-none absolute inset-x-1 rounded bg-primary/20"
                      style={{
                        top: dragOverlay.top,
                        height: dragOverlay.height,
                      }}
                    />
                  ) : null}
                  {dayEntries.map((entry) => {
                    const name =
                      entry.employeeName ??
                      employees.find((e) => e.id === entry.employeeId)?.name ??
                      t("employees.unnamed");
                    const dur =
                      entry.stop == null
                        ? t("entries.running")
                        : formatDuration(entry.durationSeconds ?? 0, locale);
                    const layout = overlap.get(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        data-entry-block
                        data-employee-id={entry.employeeId}
                        data-testid={`entries-calendar-block-${entry.id}`}
                        title={`${name} · ${entry.description} · ${dur}`}
                        className="absolute z-10 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm hover:brightness-95"
                        style={blockStyle(entry, day, layout)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(entry);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="truncate font-medium">{name}</div>
                        <div className="truncate opacity-80">
                          {entry.description}
                        </div>
                        <div className="tabular-nums opacity-80">{dur}</div>
                      </button>
                    );
                  })}
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
                <EmployeeCombobox
                  testIdPrefix="entries-create-employee"
                  inputTestId="entries-create-employee-input"
                  listTestId="entries-create-employee-list"
                  clearTestId="entries-create-employee-clear"
                  employees={employees}
                  value={createEmployeeId}
                  onValueChange={setCreateEmployeeId}
                  isLoading={employeesQuery.isLoading}
                  placeholder={t("timer.employeePlaceholder")}
                />
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
                <Label htmlFor="entry-create-start">
                  {t("entries.startLabel")}
                </Label>
                <Input
                  id="entry-create-start"
                  type="datetime-local"
                  step="1"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-create-stop">
                  {t("entries.stopLabel")}
                </Label>
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
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {formatInterval(editEntry.start, editEntry.stop, locale)}
              </p>
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
                <Label htmlFor="entry-edit-start">
                  {t("entries.startLabel")}
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
                variant="destructive"
                data-testid="entries-edit-delete"
                onClick={() => {
                  setDeleteEntry(editEntry);
                  setEditEntry(null);
                }}
              >
                {t("entries.delete")}
              </Button>
              <Button
                type="button"
                data-testid="entries-edit-save"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {t("entries.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useElapsed } from "@/hooks/useElapsed";
import { ApiError, api, queryKeys, type ActiveTimer } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  isHideConfirmDone,
  isPreferCollapsed,
  setHideConfirmDone,
  setPreferCollapsed,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export function TimerSection() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyRunningError, setAlreadyRunningError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => isPreferCollapsed());
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [a11yMessage, setA11yMessage] = useState("");

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees(1, 50),
    queryFn: () => api.listEmployees({ page: 1, limit: 50 }),
  });

  const activeQuery = useQuery({
    queryKey: queryKeys.activeTimers,
    queryFn: api.listActiveTimers,
    refetchInterval: 5000,
  });

  const employees = employeesQuery.data?.items ?? [];
  const activeTimers = activeQuery.data ?? [];

  const selectedRunning: ActiveTimer | undefined = useMemo(() => {
    if (!employeeId) return undefined;
    return activeTimers.find((timer) => timer.employeeId === employeeId);
  }, [activeTimers, employeeId]);

  const displayRunning: ActiveTimer | undefined =
    selectedRunning ?? activeTimers[0];

  const elapsed = useElapsed(displayRunning?.start);
  const isRunning = !!displayRunning;
  const selectedEmployeeName =
    employees.find((e) => e.id === (displayRunning?.employeeId ?? employeeId))
      ?.name ?? "";

  useEffect(() => {
    if (!isRunning) {
      setCollapsed(false);
      setPreferCollapsed(false);
    }
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && isPreferCollapsed() && isHideConfirmDone()) {
      setCollapsed(true);
      setPanelOpen(false);
    }
  }, [isRunning, displayRunning?.id]);

  useEffect(() => {
    if (!panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanelOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  async function invalidateTimerQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTimers }),
      queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
  }

  const startMutation = useMutation({
    mutationFn: () =>
      api.startTimer({ employeeId, description: description.trim() }),
    onSuccess: async () => {
      setAlreadyRunningError(false);
      setFormError(null);
      setCollapsed(false);
      setPreferCollapsed(false);
      setPanelOpen(true);
      setA11yMessage(t("timer.a11y.started"));
      await invalidateTimerQueries();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyRunningError(true);
        setFormError(null);
        return;
      }
      setFormError(t("timer.errors.startFailed"));
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => {
      const id = employeeId || displayRunning?.employeeId;
      if (!id) throw new Error("No employee");
      return api.stopTimer({ employeeId: id });
    },
    onSuccess: async () => {
      setCollapsed(false);
      setPreferCollapsed(false);
      setAlreadyRunningError(false);
      setA11yMessage(t("timer.a11y.stopped"));
      await invalidateTimerQueries();
    },
    onError: () => setFormError(t("timer.errors.stopFailed")),
  });

  function onStart() {
    setAlreadyRunningError(false);
    if (!employeeId) {
      setFormError(t("timer.errors.employeeRequired"));
      return;
    }
    if (!description.trim()) {
      setFormError(t("timer.errors.descriptionRequired"));
      document.getElementById("timer-description-input")?.focus();
      return;
    }
    setFormError(null);
    startMutation.mutate();
  }

  function onFabClick() {
    if (collapsed && isRunning) {
      // Restore from collapsed chip via FAB as well
      setCollapsed(false);
      setPreferCollapsed(false);
      setPanelOpen(true);
      return;
    }
    setPanelOpen((open) => !open);
  }

  function onHideClick() {
    if (!isHideConfirmDone()) {
      setHideConfirmOpen(true);
      return;
    }
    setCollapsed(true);
    setPreferCollapsed(true);
    setPanelOpen(false);
  }

  function onHideConfirmHide() {
    setHideConfirmDone();
    setHideConfirmOpen(false);
    setCollapsed(true);
    setPreferCollapsed(true);
    setPanelOpen(false);
  }

  function onHideConfirmEnd() {
    setHideConfirmDone();
    setHideConfirmOpen(false);
    stopMutation.mutate();
  }

  function onRestore() {
    setCollapsed(false);
    setPreferCollapsed(false);
    setPanelOpen(true);
  }

  const showCollapsed = isRunning && collapsed && !panelOpen;
  const showPanel = panelOpen;

  const fabLabel = isRunning
    ? t("timer.fab.running", {
        name: selectedEmployeeName || t("timer.collapsedLabel"),
        elapsed,
      })
    : showPanel
      ? t("timer.fab.close")
      : t("timer.fab.open");

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom)]">
        {showPanel ? (
          <section
            id="timer"
            data-testid="timer-panel"
            aria-labelledby="timer-heading"
            className="flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border bg-background p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="timer-heading" className="text-base font-semibold">
                {t("timer.panel.title")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("timer.fab.close")}
                onClick={() => setPanelOpen(false)}
              >
                −
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timer-employee-select">
                  {t("timer.employeeLabel")}
                </Label>
                <Select
                  value={employeeId || undefined}
                  onValueChange={(value) => {
                    setEmployeeId(value ?? "");
                    setAlreadyRunningError(false);
                    setFormError(null);
                  }}
                  disabled={employees.length === 0}
                >
                  <SelectTrigger
                    id="timer-employee-select"
                    data-testid="timer-employee-select"
                    className="w-full"
                  >
                    <SelectValue placeholder={t("timer.employeePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name || t("employees.unnamed")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      to="/employees"
                      className="underline underline-offset-2"
                    >
                      {t("timer.hints.needEmployee")}
                    </Link>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timer-description-input">
                  {t("timer.descriptionLabel")}
                </Label>
                <Input
                  id="timer-description-input"
                  data-testid="timer-description-input"
                  value={description}
                  placeholder={t("timer.descriptionPlaceholder")}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setFormError(null);
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  data-testid="timer-start-button"
                  onClick={onStart}
                  disabled={startMutation.isPending || employees.length === 0}
                >
                  {t("timer.start")}
                </Button>
                {isRunning ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid="timer-stop-button"
                      onClick={() => stopMutation.mutate()}
                      disabled={stopMutation.isPending}
                    >
                      {t("timer.stop")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="timer-hide-button"
                      onClick={onHideClick}
                    >
                      {t("timer.hide")}
                    </Button>
                  </>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              {alreadyRunningError ? (
                <p
                  data-testid="timer-already-running-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {t("timer.errors.alreadyRunning")}
                </p>
              ) : null}
            </div>

            {isRunning ? (
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {t("timer.elapsedLabel")}
                </p>
                <p
                  data-testid="timer-elapsed"
                  className="font-mono text-2xl tabular-nums"
                  aria-live="off"
                >
                  {elapsed}
                </p>
                {displayRunning ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayRunning.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {showCollapsed ? (
          <div
            data-testid="timer-collapsed"
            className="flex w-[min(22rem,calc(100vw-2rem))] flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg"
            aria-label={`${selectedEmployeeName} ${elapsed}`}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {selectedEmployeeName || t("timer.collapsedLabel")}
              </span>
              <span
                data-testid="timer-elapsed"
                className="font-mono text-lg tabular-nums"
                aria-live="off"
              >
                {elapsed}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                data-testid="timer-restore-button"
                className="min-h-11 min-w-11"
                aria-label={t("timer.a11y.expand")}
                onClick={onRestore}
              >
                {t("timer.restore")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                data-testid="timer-stop-button"
                className="min-h-11 min-w-11"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
              >
                {t("timer.stop")}
              </Button>
            </div>
          </div>
        ) : null}

        {!showCollapsed ? (
          <Button
            type="button"
            data-testid="timer-fab"
            size="icon"
            className={cn(
              "relative h-12 w-12 min-h-11 min-w-11 rounded-full shadow-lg",
              isRunning && "ring-2 ring-primary",
            )}
            aria-label={fabLabel}
            aria-expanded={showPanel}
            onClick={onFabClick}
          >
            <ClockIcon className="size-5" />
            {isRunning ? (
              <>
                <span
                  data-testid="timer-fab-badge"
                  className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-destructive"
                  aria-hidden
                />
                {!showPanel ? (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-foreground">
                    {elapsed}
                  </span>
                ) : null}
              </>
            ) : null}
          </Button>
        ) : (
          // Keep FAB discoverable for AC-3 route checks even when collapsed chip shown
          <Button
            type="button"
            data-testid="timer-fab"
            size="icon"
            className="relative h-12 w-12 min-h-11 min-w-11 rounded-full shadow-lg ring-2 ring-primary"
            aria-label={fabLabel}
            onClick={onFabClick}
          >
            <ClockIcon className="size-5" />
            <span
              data-testid="timer-fab-badge"
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-destructive"
              aria-hidden
            />
          </Button>
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        {a11yMessage}
      </div>

      <AlertDialog open={hideConfirmOpen} onOpenChange={setHideConfirmOpen}>
        <AlertDialogContent data-testid="timer-hide-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("timer.hideConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("timer.hideConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("timer.hideConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              data-testid="timer-hide-confirm-end"
              onClick={onHideConfirmEnd}
            >
              {t("timer.hideConfirm.endSession")}
            </AlertDialogAction>
            <AlertDialogAction
              data-testid="timer-hide-confirm-hide"
              autoFocus
              onClick={onHideConfirmHide}
            >
              {t("timer.hideConfirm.hide")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

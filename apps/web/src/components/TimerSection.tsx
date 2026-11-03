import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  ApiError,
  api,
  queryKeys,
  type ActiveTimer,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  isHideConfirmDone,
  isPreferCollapsed,
  setHideConfirmDone,
  setPreferCollapsed,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function TimerSection() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [employeeId, setEmployeeId] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyRunningError, setAlreadyRunningError] = useState(false);
  const [collapsed, setCollapsed] = useState(() => isPreferCollapsed());
  const [idleExpanded, setIdleExpanded] = useState(true);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [a11yMessage, setA11yMessage] = useState("");

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: api.listEmployees,
  });

  const activeQuery = useQuery({
    queryKey: queryKeys.activeTimers,
    queryFn: api.listActiveTimers,
    refetchInterval: 5000,
  });

  const employees = employeesQuery.data ?? [];
  const activeTimers = activeQuery.data ?? [];

  const selectedRunning: ActiveTimer | undefined = useMemo(() => {
    if (!employeeId) return undefined;
    return activeTimers.find((timer) => timer.employeeId === employeeId);
  }, [activeTimers, employeeId]);

  const elapsed = useElapsed(selectedRunning?.start);
  const isRunning = !!selectedRunning;
  const selectedEmployeeName =
    employees.find((e) => e.id === employeeId)?.name ?? "";

  useEffect(() => {
    if (!isRunning) {
      setCollapsed(false);
      setPreferCollapsed(false);
      setIdleExpanded(isDesktop);
    }
  }, [isRunning, isDesktop]);

  useEffect(() => {
    if (isRunning && isPreferCollapsed() && isHideConfirmDone()) {
      setCollapsed(true);
    }
  }, [isRunning, selectedRunning?.id]);

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
      setIdleExpanded(true);
      // Desktop stays expanded; mobile prefers compact chip after Start
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 768px)").matches
      ) {
        setCollapsed(true);
        setPreferCollapsed(true);
      } else {
        setCollapsed(false);
        setPreferCollapsed(false);
      }
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
      if (!employeeId) {
        throw new Error("No employee");
      }
      return api.stopTimer({ employeeId });
    },
    onSuccess: async () => {
      setCollapsed(false);
      setPreferCollapsed(false);
      setAlreadyRunningError(false);
      setIdleExpanded(isDesktop);
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

  function onHideClick() {
    if (!isHideConfirmDone()) {
      setHideConfirmOpen(true);
      return;
    }
    setCollapsed(true);
    setPreferCollapsed(true);
  }

  function onHideConfirmHide() {
    setHideConfirmDone();
    setHideConfirmOpen(false);
    setCollapsed(true);
    setPreferCollapsed(true);
  }

  function onHideConfirmEnd() {
    setHideConfirmDone();
    setHideConfirmOpen(false);
    stopMutation.mutate();
  }

  const showCollapsed = isRunning && collapsed;
  const showExpandedPanel =
    (isRunning && !collapsed) || (!isRunning && idleExpanded);
  const showIdleLauncher = !isRunning && !idleExpanded;

  const shellClass =
    "fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] pb-[env(safe-area-inset-bottom)]";

  return (
    <>
      <div className={shellClass}>
        {showIdleLauncher ? (
          <Button
            type="button"
            data-testid="timer-launcher"
            className="min-h-11 shadow-lg"
            aria-label={t("timer.launcher.open")}
            onClick={() => setIdleExpanded(true)}
          >
            {t("timer.chip.idle")}
          </Button>
        ) : null}

        {showCollapsed ? (
          <div
            data-testid="timer-collapsed"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg"
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
                onClick={() => {
                  setCollapsed(false);
                  setPreferCollapsed(false);
                }}
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

        {showExpandedPanel ? (
          <section
            id="timer"
            data-testid="timer-panel"
            aria-labelledby="timer-heading"
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-lg",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="timer-heading" className="text-base font-semibold">
                {t("timer.panel.title")}
              </h2>
              {!isRunning ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("timer.a11y.collapse")}
                  onClick={() => setIdleExpanded(false)}
                >
                  −
                </Button>
              ) : null}
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
                        {employee.name}
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
                {selectedRunning ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRunning.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
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

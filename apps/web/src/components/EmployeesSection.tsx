import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, queryKeys, type Employee } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function EmployeesSection() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: api.listEmployees,
  });

  const createMutation = useMutation({
    mutationFn: (value: string) => api.createEmployee(value),
    onSuccess: async () => {
      setName("");
      setNameError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
    onError: () => setNameError(t("employees.errors.saveFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      api.updateEmployee(id, value),
    onSuccess: async () => {
      setEditTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
        queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activeTimers }),
        queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
    },
  });

  const employees = employeesQuery.data ?? [];

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("employees.errors.nameRequired"));
      return;
    }
    createMutation.mutate(trimmed);
  }

  function openEdit(employee: Employee) {
    setEditTarget(employee);
    setEditName(employee.name);
  }

  function onSaveEdit() {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id: editTarget.id, value: trimmed });
  }

  return (
    <section id="employees" aria-labelledby="employees-heading" className="flex flex-col gap-4">
      <h2 id="employees-heading" className="text-xl font-semibold">
        {t("employees.title")}
      </h2>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="employees-name-input">{t("employees.nameLabel")}</Label>
          <Input
            id="employees-name-input"
            data-testid="employees-name-input"
            value={name}
            placeholder={t("employees.namePlaceholder")}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            aria-invalid={!!nameError}
          />
        </div>
        <Button
          type="submit"
          data-testid="employees-add-button"
          disabled={createMutation.isPending}
        >
          {t("employees.add")}
        </Button>
      </form>
      {nameError ? (
        <p className="text-sm text-destructive" role="alert">
          {nameError}
        </p>
      ) : null}

      <div data-testid="employees-list" className="flex flex-col gap-2">
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("employees.empty")}</p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              data-testid={`employee-row-${employee.id}`}
              data-employee-name={employee.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span className="font-medium" data-testid="employee-name">
                {employee.name}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(employee)}
                >
                  {t("employees.edit")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(employee)}
                >
                  {t("employees.delete")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("employees.edit")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-edit-name">{t("employees.nameLabel")}</Label>
            <Input
              id="employee-edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
            >
              {t("employees.cancel")}
            </Button>
            <Button
              type="button"
              onClick={onSaveEdit}
              disabled={updateMutation.isPending}
            >
              {t("employees.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("employees.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("employees.deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("employees.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                }
              }}
            >
              {t("employees.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

import { RowIconActions } from "@/components/RowIconActions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PaginationBar } from "@/components/PaginationBar";
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
  AlertDialogAction,
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
  type Department,
  type Employee,
  type EmployeeInput,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Tab = "people" | "departments";

const NONE_DEPT = "__none__";

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function secondaryLine(employee: Employee, noneLabel: string): string {
  const parts: string[] = [];
  const deptName = employee.department?.name;
  if (deptName) parts.push(deptName);
  if (employee.title) parts.push(employee.title);
  if (parts.length === 0 && employee.departmentId) {
    parts.push(noneLabel);
  }
  return parts.join(" · ");
}

export function EmployeesSection() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("people");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EmployeeInput>({
    name: "",
    departmentId: null,
    title: "",
    email: "",
    phone: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<EmployeeInput>({
    name: "",
    departmentId: null,
    title: "",
    email: "",
    phone: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const [deptCreateOpen, setDeptCreateOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptError, setDeptError] = useState<string | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees(page, pageSize),
    queryFn: () => api.listEmployees({ page, limit: pageSize }),
  });

  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments,
    queryFn: api.listDepartments,
  });

  const departments = departmentsQuery.data ?? [];
  const employees = employeesQuery.data?.items ?? [];
  const total = employeesQuery.data?.total ?? 0;

  async function invalidatePeople() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["employees"] }),
      queryClient.invalidateQueries({ queryKey: ["time-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTimers }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (input: EmployeeInput) => api.createEmployee(input),
    onSuccess: async (created) => {
      setCreateOpen(false);
      setFormError(null);
      await invalidatePeople();
      // Name-sorted list: jump to the page that contains the new employee.
      const limit = pageSize;
      let p = 1;
      for (;;) {
        const res = await api.listEmployees({ page: p, limit });
        if (res.items.some((e) => e.id === created.id)) {
          setPage(p);
          break;
        }
        if (res.items.length === 0 || p * limit >= res.total || p > 100) {
          setPage(1);
          break;
        }
        p += 1;
      }
    },
    onError: () => setFormError(t("employees.errors.saveFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmployeeInput }) =>
      api.updateEmployee(id, input),
    onSuccess: async () => {
      setEditTarget(null);
      await invalidatePeople();
    },
    onError: () => setEditError(t("employees.errors.saveFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidatePeople();
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: (name: string) => api.createDepartment(name),
    onSuccess: async () => {
      setDeptCreateOpen(false);
      setDeptName("");
      setDeptError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
    onError: () => setDeptError(t("departments.errors.saveFailed")),
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateDepartment(id, name),
    onSuccess: async () => {
      setEditDept(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: async () => {
      setDeleteDept(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
        setDeptError(t("departments.deleteBlocked"));
      }
    },
  });

  function openCreate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    setForm({
      name: "",
      departmentId: null,
      title: "",
      email: "",
      phone: "",
    });
    setFormError(null);
    setCreateOpen(true);
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError(t("employees.errors.nameRequired"));
      return;
    }
    if (!isValidEmail(form.email ?? "")) {
      setFormError(t("employees.errors.emailInvalid"));
      return;
    }
    createMutation.mutate({
      name,
      departmentId: form.departmentId || null,
      title: form.title?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
    });
  }

  function openEdit(employee: Employee) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    setEditTarget(employee);
    setEditForm({
      name: employee.name,
      departmentId: employee.departmentId ?? null,
      title: employee.title ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
    });
    setEditError(null);
  }

  function submitEdit() {
    if (!editTarget) return;
    const name = editForm.name.trim();
    if (!name) return;
    if (!isValidEmail(editForm.email ?? "")) {
      setEditError(t("employees.errors.emailInvalid"));
      return;
    }
    updateMutation.mutate({
      id: editTarget.id,
      input: {
        name,
        departmentId: editForm.departmentId || null,
        title: editForm.title?.trim() || null,
        email: editForm.email?.trim() || null,
        phone: editForm.phone?.trim() || null,
      },
    });
  }

  function deptSelectValue(id: string | null | undefined): string {
    return id || NONE_DEPT;
  }

  function renderEmployeeFields(
    values: EmployeeInput,
    onChange: (next: EmployeeInput) => void,
    nameTestId: string,
  ) {
    return (
      <>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameTestId}>{t("employees.nameLabel")}</Label>
          <Input
            id={nameTestId}
            data-testid={nameTestId}
            value={values.name}
            placeholder={t("employees.namePlaceholder")}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("employees.department")}</Label>
          {(() => {
            const orphanId =
              values.departmentId &&
              !departments.some((d) => d.id === values.departmentId)
                ? values.departmentId
                : null;
            const deptItems: Record<string, string> = {
              [NONE_DEPT]: t("employees.department.none"),
            };
            if (orphanId) {
              deptItems[orphanId] = t("employees.department.unknown");
            }
            for (const d of departments) {
              deptItems[d.id] = d.name;
            }
            return (
              <Select
                modal={false}
                value={deptSelectValue(values.departmentId)}
                onValueChange={(v) =>
                  onChange({
                    ...values,
                    departmentId: !v || v === NONE_DEPT ? null : v,
                  })
                }
                items={deptItems}
              >
                <SelectTrigger
                  data-testid="employee-department-select"
                  className="w-full"
                >
                  <SelectValue
                    placeholder={t("employees.department.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent data-testid="employee-department-select-content">
                  <SelectItem
                    value={NONE_DEPT}
                    data-testid="employee-department-none"
                  >
                    {t("employees.department.none")}
                  </SelectItem>
                  {orphanId ? (
                    <SelectItem value={orphanId}>
                      {t("employees.department.unknown")}
                    </SelectItem>
                  ) : null}
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-title-input">
            {t("employees.titleField")}
          </Label>
          <Input
            id="employee-title-input"
            data-testid="employee-title-input"
            value={values.title ?? ""}
            onChange={(e) => onChange({ ...values, title: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-email-input">{t("employees.email")}</Label>
          <Input
            id="employee-email-input"
            data-testid="employee-email-input"
            type="email"
            value={values.email ?? ""}
            onChange={(e) => onChange({ ...values, email: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-phone-input">{t("employees.phone")}</Label>
          <Input
            id="employee-phone-input"
            data-testid="employee-phone-input"
            value={values.phone ?? ""}
            onChange={(e) => onChange({ ...values, phone: e.target.value })}
          />
        </div>
      </>
    );
  }

  return (
    <section
      id="employees"
      aria-labelledby="employees-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="employees-heading" className="text-xl font-semibold">
          {t("employees.title")}
        </h1>
        {tab === "people" ? (
          <Button
            type="button"
            data-testid="employees-add-open"
            onClick={openCreate}
          >
            {t("employees.addOpen")}
          </Button>
        ) : (
          <Button
            type="button"
            data-testid="departments-add-open"
            onClick={() => {
              setDeptName("");
              setDeptError(null);
              setDeptCreateOpen(true);
            }}
          >
            {t("departments.addOpen")}
          </Button>
        )}
      </div>

      <div className="flex gap-2" role="tablist">
        <Button
          type="button"
          size="sm"
          role="tab"
          variant={tab === "people" ? "default" : "outline"}
          data-testid="employees-tab-people"
          aria-selected={tab === "people"}
          onClick={() => setTab("people")}
        >
          {t("employees.tabs.people")}
        </Button>
        <Button
          type="button"
          size="sm"
          role="tab"
          variant={tab === "departments" ? "default" : "outline"}
          data-testid="employees-tab-departments"
          aria-selected={tab === "departments"}
          onClick={() => setTab("departments")}
        >
          {t("employees.tabs.departments")}
        </Button>
      </div>

      {tab === "people" ? (
        <>
          <div data-testid="employees-list" className="flex flex-col gap-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("employees.empty")}
              </p>
            ) : (
              employees.map((employee) => {
                const secondary = secondaryLine(
                  employee,
                  t("employees.department.none"),
                );
                return (
                  <div
                    key={employee.id}
                    data-testid={`employee-row-${employee.id}`}
                    data-employee-name={employee.name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/employees/${employee.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                        data-testid="employee-name"
                      >
                        {employee.name || t("employees.unnamed")}
                      </Link>
                      {secondary ? (
                        <p
                          data-testid="employee-row-secondary"
                          className="truncate text-sm text-muted-foreground"
                        >
                          {secondary}
                        </p>
                      ) : (
                        <p
                          data-testid="employee-row-secondary"
                          className="text-sm text-muted-foreground"
                        >
                          {t("employees.department.none")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/employees/${employee.id}`}
                        className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                      >
                        {t("employees.openProfile")}
                      </Link>
                      <RowIconActions
                        editLabel={t("employees.edit")}
                        deleteLabel={t("employees.delete")}
                        onEdit={() => openEdit(employee)}
                        onDelete={() => setDeleteTarget(employee)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <PaginationBar
            testId="employees-pagination"
            page={page}
            limit={pageSize}
            total={total}
            onPageChange={setPage}
            onLimitChange={(limit) => {
              setPageSize(limit);
              setPage(1);
            }}
          />
        </>
      ) : (
        <div data-testid="departments-list" className="flex flex-col gap-2">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("departments.empty")}
            </p>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span className="font-medium">{dept.name}</span>
                <RowIconActions
                  editLabel={t("departments.edit")}
                  deleteLabel={t("departments.delete")}
                  onEdit={() => {
                    setEditDept(dept);
                    setEditDeptName(dept.name);
                  }}
                  onDelete={() => setDeleteDept(dept)}
                />
              </div>
            ))
          )}
          {deptError ? (
            <p className="text-sm text-destructive" role="alert">
              {deptError}
            </p>
          ) : null}
        </div>
      )}

      {createOpen ? (
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) setCreateOpen(false);
          }}
        >
          <DialogContent data-testid="employees-create-dialog">
            <DialogHeader>
              <DialogTitle>{t("employees.createTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitCreate} className="flex flex-col gap-3">
              {renderEmployeeFields(form, setForm, "employees-name-input")}
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("employees.cancel")}
                </Button>
                <Button
                  type="submit"
                  data-testid="employees-add-button"
                  disabled={createMutation.isPending}
                >
                  {t("employees.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {editTarget ? (
        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        >
          <DialogContent data-testid="employees-edit-dialog">
            <DialogHeader>
              <DialogTitle>{t("employees.editTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {renderEmployeeFields(
                editForm,
                setEditForm,
                "employees-name-input",
              )}
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
                onClick={() => setEditTarget(null)}
              >
                {t("employees.cancel")}
              </Button>
              <Button
                type="button"
                onClick={submitEdit}
                disabled={updateMutation.isPending}
              >
                {t("employees.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("employees.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("employees.deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("employees.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {t("employees.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {deptCreateOpen ? (
        <Dialog
          open={deptCreateOpen}
          onOpenChange={(open) => {
            if (!open) setDeptCreateOpen(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("departments.createTitle")}</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = deptName.trim();
                if (!name) {
                  setDeptError(t("departments.errors.nameRequired"));
                  return;
                }
                createDeptMutation.mutate(name);
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="departments-name-input">
                  {t("departments.name")}
                </Label>
                <Input
                  id="departments-name-input"
                  data-testid="departments-name-input"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  autoFocus
                />
              </div>
              {deptError ? (
                <p className="text-sm text-destructive" role="alert">
                  {deptError}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeptCreateOpen(false)}
                >
                  {t("employees.cancel")}
                </Button>
                <Button
                  type="submit"
                  data-testid="departments-add-button"
                  disabled={createDeptMutation.isPending}
                >
                  {t("employees.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {editDept ? (
        <Dialog
          open={!!editDept}
          onOpenChange={(open) => {
            if (!open) setEditDept(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("departments.editTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                data-testid="departments-name-input"
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDept(null)}
              >
                {t("employees.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!editDept) return;
                  updateDeptMutation.mutate({
                    id: editDept.id,
                    name: editDeptName.trim(),
                  });
                }}
              >
                {t("employees.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog
        open={!!deleteDept}
        onOpenChange={(open) => {
          if (!open) setDeleteDept(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("departments.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("departments.deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("employees.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteDept) deleteDeptMutation.mutate(deleteDept.id);
              }}
            >
              {t("departments.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

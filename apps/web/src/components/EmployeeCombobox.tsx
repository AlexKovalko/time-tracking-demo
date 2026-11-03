import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Props = {
  /** Prefix for data-testid roots, e.g. entries-filter-employee */
  testIdPrefix: string;
  inputTestId?: string;
  listTestId?: string;
  clearTestId?: string;
  employees: Employee[];
  /** Selected id, `"all"` (filter), or `""` (form empty). */
  value: string;
  onValueChange: (next: string) => void;
  allowAll?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

function employeeLabel(emp: Employee | undefined, unnamed: string): string {
  if (!emp) return "";
  return emp.name?.trim() || unnamed;
}

export function EmployeeCombobox({
  testIdPrefix,
  inputTestId,
  listTestId,
  clearTestId,
  employees,
  value,
  onValueChange,
  allowAll = false,
  isLoading = false,
  disabled = false,
  className,
  placeholder,
}: Props) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const unnamed = t("employees.unnamed");
  const allLabel = t("entries.filter.employeeAll");
  const placeholderText =
    placeholder ?? t("combobox.employee.placeholder");

  const committedLabel = useMemo(() => {
    if (allowAll && value === "all") return allLabel;
    if (!value) return "";
    return employeeLabel(
      employees.find((e) => e.id === value),
      unnamed,
    );
  }, [allowAll, allLabel, employees, unnamed, value]);

  // Keep input display in sync with committed value when closed.
  useEffect(() => {
    if (!open) {
      setQuery(committedLabel);
    }
  }, [committedLabel, open]);

  const filterQuery = open ? query.trim().toLowerCase() : "";
  const browsingCommitted =
    Boolean(committedLabel) &&
    filterQuery === committedLabel.trim().toLowerCase();

  const showAllOption =
    allowAll &&
    (!filterQuery ||
      browsingCommitted ||
      allLabel.toLowerCase().includes(filterQuery));

  const filteredEmployees = useMemo(() => {
    if (!filterQuery || browsingCommitted) return employees;
    return employees.filter((emp) =>
      employeeLabel(emp, unnamed).toLowerCase().includes(filterQuery),
    );
  }, [browsingCommitted, employees, filterQuery, unnamed]);

  const options = useMemo(() => {
    const rows: Array<{ id: string; label: string }> = [];
    if (showAllOption) {
      rows.push({ id: "all", label: allLabel });
    }
    for (const emp of filteredEmployees) {
      rows.push({ id: emp.id, label: employeeLabel(emp, unnamed) });
    }
    return rows;
  }, [allLabel, filteredEmployees, showAllOption, unnamed]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filterQuery, open]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(committedLabel);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [committedLabel, open]);

  function labelForId(id: string): string {
    if (id === "all") return allLabel;
    if (!id) return "";
    return employeeLabel(
      employees.find((e) => e.id === id),
      unnamed,
    );
  }

  function commit(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery(labelForId(next));
  }

  function clearSelection() {
    if (allowAll) {
      commit("all");
    } else {
      onValueChange("");
      setQuery("");
      setOpen(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery(committedLabel);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      commit(options[activeIndex].id);
    }
  }

  const showClear =
    allowAll ? value !== "all" && value !== "" : Boolean(value);

  const emptyMessage = isLoading
    ? t("combobox.employee.loading")
    : employees.length === 0
      ? t("combobox.employee.empty")
      : t("combobox.employee.noResults");

  const showClosedLabel = !open && Boolean(committedLabel);

  return (
    <div
      ref={rootRef}
      data-testid={testIdPrefix}
      className={cn("relative w-full", className)}
    >
      <div
        className={cn(
          "relative flex h-8 w-full items-center gap-1 rounded-lg border border-input bg-transparent pr-1.5 pl-2.5 text-sm transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {showClosedLabel ? (
          <span className="pointer-events-none absolute inset-y-0 left-2.5 right-8 flex items-center truncate">
            {committedLabel}
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          data-testid={inputTestId ?? `${testIdPrefix}-input`}
          disabled={disabled || isLoading}
          placeholder={showClosedLabel ? undefined : placeholderText}
          value={query}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            showClosedLabel && "text-transparent caret-foreground",
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {showClear ? (
          <button
            type="button"
            data-testid={clearTestId ?? `${testIdPrefix}-clear`}
            aria-label={t("combobox.employee.clear")}
            className="relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearSelection();
              inputRef.current?.focus();
            }}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          id={listId}
          data-testid={listTestId ?? `${testIdPrefix}-list`}
          role="listbox"
          className="absolute z-[200] mt-1 max-h-60 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            options.map((opt, index) => (
              <div
                key={opt.id}
                role="option"
                aria-selected={value === opt.id}
                data-highlighted={index === activeIndex ? "" : undefined}
                className={cn(
                  "cursor-default rounded-md px-2 py-1.5 text-sm outline-none",
                  index === activeIndex && "bg-accent text-accent-foreground",
                  value === opt.id && "font-medium",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  // Prevent input blur before click commits.
                  e.preventDefault();
                }}
                onClick={() => commit(opt.id)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

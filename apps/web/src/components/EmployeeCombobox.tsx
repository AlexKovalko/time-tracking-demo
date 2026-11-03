import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type Employee } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const DEBOUNCE_MS = 280;
const PAGE_LIMIT = 20;

type Props = {
  /** Prefix for data-testid roots, e.g. entries-filter-employee */
  testIdPrefix: string;
  inputTestId?: string;
  listTestId?: string;
  clearTestId?: string;
  /** Selected id, `"all"` (filter), or `""` (form empty). */
  value: string;
  onValueChange: (next: string) => void;
  /** Fires when the resolved selected employee (or null) changes. */
  onSelectedEmployeeChange?: (employee: Employee | null) => void;
  allowAll?: boolean;
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
  value,
  onValueChange,
  onSelectedEmployeeChange,
  allowAll = false,
  disabled = false,
  className,
  placeholder,
}: Props) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchSeq = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** null = debounce not settled yet (no network fetch). */
  const [debouncedQ, setDebouncedQ] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [options, setOptions] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [browseTotal, setBrowseTotal] = useState<number | null>(null);
  const [selectionCache, setSelectionCache] = useState<Employee | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");

  const unnamed = t("employees.unnamed");
  const placeholderText =
    placeholder ?? t("combobox.employee.placeholder");

  // allowAll + value "all" = implicit all-employees filter; keep input empty
  // (do not paint an "all employees" label as committed value or list option).
  const committedLabel = value === "all" ? "" : selectedLabel;

  const isBrowsingCommitted =
    Boolean(committedLabel) &&
    query.trim().toLowerCase() === committedLabel.trim().toLowerCase();

  const desiredSearchQ = !open
    ? ""
    : isBrowsingCommitted
      ? ""
      : query.trim();

  // Debounce all searches including the initial open browse (AC-2 / AC-8).
  useEffect(() => {
    if (!open) {
      setDebouncedQ(null);
      return;
    }
    setDebouncedQ(null);
    const handle = window.setTimeout(() => {
      setDebouncedQ(desiredSearchQ);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [desiredSearchQ, open]);

  // Resolve selected employee label via selectionCache and/or getEmployee.
  useEffect(() => {
    let cancelled = false;
    async function resolveSelected() {
      if (allowAll && value === "all") {
        setSelectedLabel("");
        setSelectionCache(null);
        onSelectedEmployeeChange?.(null);
        return;
      }
      if (!value) {
        setSelectedLabel("");
        setSelectionCache(null);
        onSelectedEmployeeChange?.(null);
        return;
      }
      if (selectionCache?.id === value) {
        const label = employeeLabel(selectionCache, unnamed);
        setSelectedLabel(label);
        onSelectedEmployeeChange?.(selectionCache);
        return;
      }
      try {
        const emp = await api.getEmployee(value);
        if (cancelled) return;
        setSelectionCache(emp);
        setSelectedLabel(employeeLabel(emp, unnamed));
        onSelectedEmployeeChange?.(emp);
      } catch {
        if (cancelled) return;
        setSelectedLabel(unnamed);
        onSelectedEmployeeChange?.(null);
      }
    }
    void resolveSelected();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowAll, unnamed, value]);

  const fetchEmployees = useCallback(
    async (q: string, pageToLoad: number, append: boolean) => {
      const seq = ++fetchSeq.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await api.listEmployees({
          page: pageToLoad,
          limit: PAGE_LIMIT,
          q: q || undefined,
        });
        if (seq !== fetchSeq.current) return;
        setBrowseTotal(res.total);
        setPage(pageToLoad);
        setHasMore(pageToLoad * PAGE_LIMIT < res.total);
        setOptions((prev) => (append ? [...prev, ...res.items] : res.items));
      } catch {
        if (seq !== fetchSeq.current) return;
        if (!append) {
          setOptions([]);
          setHasMore(false);
          setBrowseTotal(0);
        }
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Fetch page 1 only after debounce has settled.
  useEffect(() => {
    if (!open || debouncedQ === null) return;
    void fetchEmployees(debouncedQ, 1, false);
  }, [debouncedQ, fetchEmployees, open]);

  // Keep input display in sync with committed value when closed.
  useEffect(() => {
    if (!open) {
      setQuery(committedLabel);
      setOptions([]);
      setPage(1);
      setHasMore(false);
      setLoading(false);
    }
  }, [committedLabel, open]);

  const listRows = useMemo(() => {
    const rows: Array<{ id: string; label: string }> = [];

    // Pin selected employee when absent from current search page (AC-4).
    if (
      value &&
      value !== "all" &&
      selectionCache &&
      selectionCache.id === value &&
      !options.some((e) => e.id === value)
    ) {
      rows.push({
        id: selectionCache.id,
        label: employeeLabel(selectionCache, unnamed),
      });
    }

    for (const emp of options) {
      rows.push({ id: emp.id, label: employeeLabel(emp, unnamed) });
    }
    return rows;
  }, [options, selectionCache, unnamed, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQ, open]);

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

  function commit(next: string) {
    if (next === "all") {
      setSelectionCache(null);
      setSelectedLabel("");
      onSelectedEmployeeChange?.(null);
      onValueChange("all");
      setOpen(false);
      setQuery("");
      return;
    }
    if (!next) {
      setSelectionCache(null);
      onSelectedEmployeeChange?.(null);
      onValueChange("");
      setOpen(false);
      setQuery("");
      return;
    }
    const fromOptions = options.find((e) => e.id === next);
    const emp =
      fromOptions ??
      (selectionCache?.id === next ? selectionCache : undefined);
    if (emp) {
      setSelectionCache(emp);
      setSelectedLabel(employeeLabel(emp, unnamed));
      onSelectedEmployeeChange?.(emp);
    }
    onValueChange(next);
    setOpen(false);
    setQuery(emp ? employeeLabel(emp, unnamed) : "");
  }

  function clearSelection() {
    if (allowAll) commit("all");
    else commit("");
  }

  function loadMore() {
    if (!hasMore || loading || loadingMore || debouncedQ === null) return;
    void fetchEmployees(debouncedQ, page + 1, true);
  }

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadMore();
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
      setActiveIndex((i) =>
        Math.min(i + 1, Math.max(listRows.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && listRows[activeIndex]) {
      event.preventDefault();
      commit(listRows[activeIndex].id);
    }
  }

  const showClear = allowAll
    ? value !== "all" && value !== ""
    : Boolean(value);
  const showClosedLabel = !open && Boolean(committedLabel);
  const searchActive = open && !isBrowsingCommitted && query.trim().length > 0;

  // Loading while debounce pending or in-flight first page (AC-8).
  const showLoading =
    open &&
    options.length === 0 &&
    (debouncedQ === null || loading);
  const showBrowseEmpty =
    open &&
    !showLoading &&
    !searchActive &&
    options.length === 0 &&
    browseTotal === 0;
  const showNoResults =
    open && !showLoading && searchActive && options.length === 0;

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
          disabled={disabled}
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
          ref={listRef}
          id={listId}
          data-testid={listTestId ?? `${testIdPrefix}-list`}
          role="listbox"
          className="absolute z-[200] mt-1 max-h-60 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          onScroll={onListScroll}
        >
          {showLoading ? (
            <div
              data-testid={`${testIdPrefix}-loading`}
              className="px-2 py-1.5 text-sm text-muted-foreground"
            >
              {t("combobox.employee.loading")}
            </div>
          ) : null}
          {showBrowseEmpty ? (
            <div
              data-testid={`${testIdPrefix}-empty`}
              className="px-2 py-1.5 text-sm text-muted-foreground"
            >
              {t("combobox.employee.empty")}
            </div>
          ) : null}
          {showNoResults ? (
            <div
              data-testid={`${testIdPrefix}-no-results`}
              className="px-2 py-1.5 text-sm text-muted-foreground"
            >
              {t("combobox.employee.noResults")}
            </div>
          ) : null}
          {!showLoading && !showBrowseEmpty
            ? listRows.map((opt, index) => (
                <div
                  key={`${opt.id}-${index}`}
                  role="option"
                  aria-selected={value === opt.id}
                  data-highlighted={index === activeIndex ? "" : undefined}
                  className={cn(
                    "cursor-default rounded-md px-2 py-1.5 text-sm outline-none",
                    index === activeIndex &&
                      "bg-accent text-accent-foreground",
                    value === opt.id && "font-medium",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => commit(opt.id)}
                >
                  {opt.label}
                </div>
              ))
            : null}
          {loadingMore ? (
            <div
              data-testid={`${testIdPrefix}-loading`}
              className="px-2 py-1.5 text-sm text-muted-foreground"
            >
              {t("combobox.employee.loading")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

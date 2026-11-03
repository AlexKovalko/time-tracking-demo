import { chartLabel, chartValue, type ChartBucket } from "@/lib/api";
import { chartColorAt } from "@/lib/colors";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  data: ChartBucket[];
  emptyLabel: string;
  ariaLabel: string;
  testId: string;
  emptyTestId?: string;
  unassignedLabel?: string;
  formatLabel?: (raw: string) => string;
};

export function BarChart({
  data,
  emptyLabel,
  ariaLabel,
  testId,
  emptyTestId,
  unassignedLabel,
  formatLabel,
}: Props) {
  const { locale } = useI18n();
  const rows = data.map((row, index) => {
    const raw = chartLabel(row, "");
    const base =
      !raw || raw === "unassigned" || raw === "null"
        ? (unassignedLabel ?? (raw || "—"))
        : raw;
    const label = formatLabel ? formatLabel(base) : base;
    return {
      label,
      value: chartValue(row),
      color: chartColorAt(index),
      key: raw || String(index),
    };
  });
  const max = Math.max(0, ...rows.map((r) => r.value));
  const hasData = rows.some((r) => r.value > 0);

  if (!hasData) {
    return (
      <div
        data-testid={testId}
        role="region"
        aria-label={ariaLabel}
        className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
      >
        <p data-testid={emptyTestId}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      role="region"
      aria-label={ariaLabel}
      className="flex flex-col gap-2 rounded-lg border p-4"
    >
      <ul className="flex flex-col gap-2" role="list">
        {rows.map((row) => {
          const pct = max > 0 ? (row.value / max) * 100 : 0;
          return (
            <li
              key={row.key}
              data-segment
              data-segment-label={row.label}
              className="flex flex-col gap-1 text-sm"
            >
              <div className="flex justify-between gap-2">
                <span className="truncate">{row.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatDuration(row.value, locale)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className={cn("h-full rounded")}
                  style={{ width: `${pct}%`, backgroundColor: row.color }}
                  role="img"
                  aria-label={`${row.label}: ${formatDuration(row.value, locale)}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

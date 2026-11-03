import { chartLabel, chartValue, type ChartBucket } from "@/lib/api";
import { chartColorAt } from "@/lib/colors";
import { formatDuration, formatWeekBucketLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: ChartBucket[];
  emptyLabel: string;
  ariaLabel: string;
  testId: string;
  emptyTestId?: string;
  unassignedLabel?: string;
  /** When "week", labels use formatWeekBucketLabel (AC-44). */
  bucket?: "day" | "week";
  /** Optional override for label formatting. */
  formatLabel?: (raw: string) => string;
};

const CHART_H = 240;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 72;

export function CompactBarChart({
  data,
  emptyLabel,
  ariaLabel,
  testId,
  emptyTestId,
  unassignedLabel,
  bucket = "day",
  formatLabel,
}: Props) {
  const { locale } = useI18n();
  const rows = data.map((row, index) => {
    const raw = chartLabel(row, "");
    const base =
      !raw || raw === "unassigned" || raw === "null"
        ? (unassignedLabel ?? (raw || "—"))
        : raw;
    let label: string;
    if (formatLabel) {
      label = formatLabel(base);
    } else if (bucket === "week") {
      label = formatWeekBucketLabel(base, locale);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(base)) {
      const [y, m, d] = base.slice(0, 10).split("-");
      label = `${d}.${m}.${y}`;
    } else {
      label = base;
    }
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
        data-chart-layout="compact"
        role="region"
        aria-label={ariaLabel}
        className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
      >
        <p data-testid={emptyTestId}>{emptyLabel}</p>
      </div>
    );
  }

  const width = Math.max(320, rows.length * 40 + PAD_L + PAD_R);
  const plotW = width - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;
  const gap = 4;
  const barW = Math.max(8, plotW / rows.length - gap);

  return (
    <div
      data-testid={testId}
      data-chart-layout="compact"
      role="region"
      aria-label={ariaLabel}
      className="overflow-x-auto rounded-lg border p-3"
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={CHART_H}
        viewBox={`0 0 ${width} ${CHART_H}`}
        className="mx-auto block max-h-[280px]"
      >
        <line
          data-axis="x"
          data-chart-axis="x"
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={PAD_L + plotW}
          y2={PAD_T + plotH}
          stroke="currentColor"
          strokeOpacity={0.25}
        />
        {rows.map((row, i) => {
          const h = max > 0 ? (row.value / max) * plotH : 0;
          const x = PAD_L + i * (barW + gap) + gap / 2;
          const y = PAD_T + plotH - h;
          const labelY = PAD_T + plotH + 10;
          return (
            <g key={`${row.key}-${i}`}>
              <rect
                data-segment
                data-segment-label={row.label}
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, row.value > 0 ? 2 : 0)}
                fill={row.color}
                rx={2}
              >
                <title>
                  {row.label}: {formatDuration(row.value, locale)}
                </title>
              </rect>
              <text
                x={x + barW / 2}
                y={labelY}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 8 }}
                transform={`rotate(-40 ${x + barW / 2} ${labelY})`}
              >
                {row.label.length > 28
                  ? `${row.label.slice(0, 26)}…`
                  : row.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={`full-${row.key}`} data-segment-label>
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

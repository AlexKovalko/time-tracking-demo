import { useRef, useState, type KeyboardEvent } from "react";
import { chartLabel, chartValue, type ChartBucket } from "@/lib/api";
import { chartColorAt } from "@/lib/colors";
import { formatDuration, formatWeekBucketLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  ChartTooltip,
  type ChartTooltipState,
} from "@/components/ChartTooltip";

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

const CHART_H = 220;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 16;

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
  const { locale, t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<ChartTooltipState>(null);

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

  function showTipFor(
    row: (typeof rows)[number],
    clientX: number,
    clientY: number,
  ) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      label: row.label,
      value: formatDuration(row.value, locale),
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  function hideTip() {
    setTip(null);
  }

  function onSegmentKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    row: (typeof rows)[number],
  ) {
    if (event.key === "Escape") {
      hideTip();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const el = event.currentTarget;
      const box = el.getBoundingClientRect();
      const wrap = wrapRef.current?.getBoundingClientRect();
      if (!wrap) return;
      setTip({
        label: row.label,
        value: formatDuration(row.value, locale),
        x: box.left + box.width / 2 - wrap.left,
        y: box.top - wrap.top,
      });
    }
  }

  return (
    <div
      ref={wrapRef}
      data-testid={testId}
      data-chart-layout="compact"
      role="region"
      aria-label={ariaLabel}
      className="relative overflow-x-auto rounded-lg border p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") hideTip();
      }}
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
          const duration = formatDuration(row.value, locale);
          if (row.value <= 0) {
            return <g key={`${row.key}-${i}`} />;
          }
          return (
            <g key={`${row.key}-${i}`}>
              <rect
                data-segment
                data-segment-label={row.label}
                tabIndex={0}
                role="img"
                aria-label={t("charts.tooltip.a11y", {
                  label: row.label,
                  value: duration,
                })}
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                fill={row.color}
                rx={2}
                className="cursor-pointer outline-none focus-visible:stroke-ring focus-visible:stroke-2"
                onMouseEnter={(e) => showTipFor(row, e.clientX, e.clientY)}
                onMouseMove={(e) => showTipFor(row, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
                onFocus={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const wrap = wrapRef.current?.getBoundingClientRect();
                  if (!wrap) return;
                  setTip({
                    label: row.label,
                    value: duration,
                    x: box.left + box.width / 2 - wrap.left,
                    y: box.top - wrap.top,
                  });
                }}
                onBlur={hideTip}
                onClick={(e) => showTipFor(row, e.clientX, e.clientY)}
                onKeyDown={(e) => onSegmentKeyDown(e, row)}
              />
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} testId="chart-tooltip" />
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

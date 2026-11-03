import { useRef, useState, type KeyboardEvent } from "react";
import { chartLabel, chartValue, type ChartBucket } from "@/lib/api";
import { chartColorAt, colorForKey } from "@/lib/colors";
import { formatDuration } from "@/lib/format";
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
  variant?: "pie" | "donut";
  /** Optional caption under the center total (donut only). */
  totalCaption?: string;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.9) {
    // Full ring via two halves
    const mid = startAngle + 180;
    return (
      donutSlice(cx, cy, outer, inner, startAngle, mid) +
      " " +
      donutSlice(cx, cy, outer, inner, mid, endAngle)
    );
  }
  const o0 = polar(cx, cy, outer, endAngle);
  const o1 = polar(cx, cy, outer, startAngle);
  const i0 = polar(cx, cy, inner, startAngle);
  const i1 = polar(cx, cy, inner, endAngle);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${outer} ${outer} 0 ${large} 0 ${o1.x} ${o1.y}`,
    `L ${i0.x} ${i0.y}`,
    `A ${inner} ${inner} 0 ${large} 1 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

export function PieChart({
  data,
  emptyLabel,
  ariaLabel,
  testId,
  emptyTestId,
  unassignedLabel,
  variant = "donut",
  totalCaption,
}: Props) {
  const { locale, t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<ChartTooltipState>(null);

  const rows = data
    .map((row, index) => {
      const raw = chartLabel(row, "");
      const label =
        !raw ||
        raw === "unassigned" ||
        raw === "null" ||
        raw === "Unassigned"
          ? (unassignedLabel ?? (raw || "—"))
          : raw;
      const key = String(
        row.key ?? row.employeeId ?? row.departmentId ?? raw ?? index,
      );
      return {
        label,
        value: chartValue(row),
        color: colorForKey(key) || chartColorAt(index),
        key,
      };
    })
    .filter((r) => r.value > 0);

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  if (total <= 0) {
    return (
      <div
        data-testid={testId}
        data-chart-type={variant}
        role="region"
        aria-label={ariaLabel}
        className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
      >
        <p data-testid={emptyTestId}>{emptyLabel}</p>
      </div>
    );
  }

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 88;
  const inner = variant === "donut" ? 52 : 0;
  const totalFormatted = formatDuration(total, locale);
  const centerCaption = totalCaption ?? t("charts.breakdown.totalHours");

  const slices = rows.reduce<
    Array<(typeof rows)[number] & { start: number; end: number }>
  >((acc, row) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    const sweep = Math.max((row.value / total) * 360, 0.01);
    acc.push({ ...row, start, end: start + sweep });
    return acc;
  }, []);

  function showTipFor(
    slice: (typeof slices)[number],
    clientX: number,
    clientY: number,
  ) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      label: slice.label,
      value: formatDuration(slice.value, locale),
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  function hideTip() {
    setTip(null);
  }

  function onSliceKeyDown(
    event: KeyboardEvent<SVGPathElement>,
    slice: (typeof slices)[number],
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
        label: slice.label,
        value: formatDuration(slice.value, locale),
        x: box.left + box.width / 2 - wrap.left,
        y: box.top - wrap.top,
      });
    }
  }

  return (
    <div
      ref={wrapRef}
      data-testid={testId}
      data-chart-type={variant}
      role="region"
      aria-label={ariaLabel}
      className="relative flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") hideTip();
      }}
    >
      <div
        className="relative mx-auto shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={ariaLabel}
          className="block"
        >
          {slices.map((slice) => {
            let d: string;
            if (inner <= 0) {
              const start = polar(cx, cy, outer, slice.end);
              const end = polar(cx, cy, outer, slice.start);
              const large = slice.end - slice.start > 180 ? 1 : 0;
              d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${outer} ${outer} 0 ${large} 0 ${end.x} ${end.y} Z`;
            } else {
              d = donutSlice(cx, cy, outer, inner, slice.start, slice.end);
            }
            const duration = formatDuration(slice.value, locale);
            return (
              <path
                key={slice.key}
                data-segment
                data-segment-label={slice.label}
                tabIndex={0}
                role="img"
                aria-label={t("charts.tooltip.a11y", {
                  label: slice.label,
                  value: duration,
                })}
                d={d}
                fill={slice.color}
                className="cursor-pointer outline-none focus-visible:stroke-ring focus-visible:stroke-2"
                onMouseEnter={(e) => showTipFor(slice, e.clientX, e.clientY)}
                onMouseMove={(e) => showTipFor(slice, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
                onFocus={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const wrap = wrapRef.current?.getBoundingClientRect();
                  if (!wrap) return;
                  setTip({
                    label: slice.label,
                    value: duration,
                    x: box.left + box.width / 2 - wrap.left,
                    y: box.top - wrap.top,
                  });
                }}
                onBlur={hideTip}
                onClick={(e) => showTipFor(slice, e.clientX, e.clientY)}
                onKeyDown={(e) => onSliceKeyDown(e, slice)}
              />
            );
          })}
        </svg>
        {variant === "donut" ? (
          <div
            data-testid={`${testId}-total`}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            <span className="text-sm font-semibold leading-tight tabular-nums">
              {totalFormatted}
            </span>
            <span className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">
              {centerCaption}
            </span>
          </div>
        ) : null}
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm" role="list">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="flex items-center justify-between gap-2"
            data-segment={slice.key}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="truncate" data-segment-label>
                {slice.label}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatDuration(slice.value, locale)}
            </span>
          </li>
        ))}
      </ul>
      <ChartTooltip tip={tip} testId="chart-tooltip" />
    </div>
  );
}

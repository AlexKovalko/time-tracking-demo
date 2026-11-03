import { chartLabel, chartValue, type ChartBucket } from "@/lib/api";
import { chartColorAt, colorForKey } from "@/lib/colors";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: ChartBucket[];
  emptyLabel: string;
  ariaLabel: string;
  testId: string;
  emptyTestId?: string;
  unassignedLabel?: string;
  variant?: "pie" | "donut";
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
    return donutSlice(cx, cy, outer, inner, startAngle, mid) +
      " " +
      donutSlice(cx, cy, outer, inner, mid, endAngle);
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
}: Props) {
  const { locale } = useI18n();
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
  const inner = variant === "donut" ? 48 : 0;

  const slices = rows.reduce<
    Array<(typeof rows)[number] & { start: number; end: number }>
  >((acc, row) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    const sweep = Math.max((row.value / total) * 360, 0.01);
    acc.push({ ...row, start, end: start + sweep });
    return acc;
  }, []);

  return (
    <div
      data-testid={testId}
      data-chart-type={variant}
      role="region"
      aria-label={ariaLabel}
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        className="mx-auto shrink-0"
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
          return (
            <path
              key={slice.key}
              data-segment
              data-segment-label={slice.label}
              d={d}
              fill={slice.color}
            >
              <title>
                {slice.label}: {formatDuration(slice.value, locale)}
              </title>
            </path>
          );
        })}
      </svg>
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
    </div>
  );
}

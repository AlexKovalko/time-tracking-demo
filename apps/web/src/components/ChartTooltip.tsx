import { useI18n } from "@/lib/i18n";

export type ChartTooltipState = {
  label: string;
  value: string;
  x: number;
  y: number;
} | null;

type Props = {
  tip: ChartTooltipState;
  testId?: string;
};

/** Shared floating chart tooltip chrome (profile + reports). */
export function ChartTooltip({ tip, testId = "chart-tooltip" }: Props) {
  const { t } = useI18n();
  if (!tip) return null;
  return (
    <div
      data-testid={testId}
      role="tooltip"
      aria-label={t("charts.tooltip.a11y", {
        label: tip.label,
        value: tip.value,
      })}
      className="pointer-events-none absolute z-[100] max-w-xs rounded-md border border-border bg-popover px-2.5 py-1.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{ left: tip.x, top: tip.y, transform: "translate(-50%, -110%)" }}
    >
      {tip.label}: {tip.value}
    </div>
  );
}

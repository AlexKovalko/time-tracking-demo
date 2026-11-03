import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZES = [10, 20, 50] as const;

type Props = {
  testId: string;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
};

export function PaginationBar({
  testId,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: Props) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      data-testid={testId}
      className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
    >
      <span>{t("pagination.range", { from, to, total })}</span>
      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange ? (
          <div className="flex items-center gap-2">
            <span id={`${testId}-page-size-label`} className="whitespace-nowrap">
              {t("pagination.pageSize")}
            </span>
            <Select
              modal={false}
              value={String(limit)}
              onValueChange={(v) => {
                if (!v) return;
                onLimitChange(Number(v));
              }}
              items={Object.fromEntries(
                PAGE_SIZES.map((n) => [
                  String(n),
                  t("pagination.pageSize.option", { n }),
                ]),
              )}
            >
              <SelectTrigger
                data-testid={`${testId}-page-size`}
                aria-labelledby={`${testId}-page-size-label`}
                size="sm"
                className="min-w-[4.5rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                data-testid={`${testId}-page-size-content`}
                side="top"
              >
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t("pagination.pageSize.option", { n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`${testId}-prev`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("pagination.prev")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`${testId}-next`}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}

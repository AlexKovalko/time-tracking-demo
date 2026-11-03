import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type Props = {
  testId: string;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({
  testId,
  page,
  limit,
  total,
  onPageChange,
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
      <span>
        {t("pagination.range", { from, to, total })}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("pagination.prev")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}

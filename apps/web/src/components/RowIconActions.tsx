import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  editTestId?: string;
  deleteTestId?: string;
};

/** Icon-only edit/delete with accessible name from i18n (aria-label + title). */
export function RowIconActions({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  editTestId,
  deleteTestId,
}: Props) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        data-testid={editTestId}
        aria-label={editLabel}
        title={editLabel}
        onClick={onEdit}
      >
        <PencilIcon className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="destructive"
        data-testid={deleteTestId}
        aria-label={deleteLabel}
        title={deleteLabel}
        onClick={onDelete}
      >
        <Trash2Icon className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

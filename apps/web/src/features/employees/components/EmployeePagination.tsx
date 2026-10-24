import { Button } from '@/components/ui/button';

export function EmployeePagination({
  total,
  limit,
  offset,
  onOffsetChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}) {
  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {total.toLocaleString()} employee{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          Page {currentPage} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={offset + limit >= total}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

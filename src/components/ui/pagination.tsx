import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function getPages(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const pages = getPages();

  return (
    <nav
      role="navigation"
      aria-label="Seitennavigation"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-8 items-center justify-center rounded-md border text-sm opacity-40 cursor-not-allowed">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {/* Pages */}
      {pages.map((page, idx) =>
        page === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex size-8 items-center justify-center text-sm text-muted-foreground"
          >
            <MoreHorizontal className="size-4" />
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors",
              currentPage === page
                ? "bg-primary text-primary-foreground font-medium"
                : "border hover:bg-muted",
            )}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Link>
        ),
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
          aria-label="Nächste Seite"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-8 items-center justify-center rounded-md border text-sm opacity-40 cursor-not-allowed">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

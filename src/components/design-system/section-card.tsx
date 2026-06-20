import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionCardVariant = "default" | "alert" | "warning";

interface SectionCardProps {
  title: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: SectionCardVariant;
  contentClassName?: string;
  className?: string;
  noPadding?: boolean;
}

const variantStyles: Record<SectionCardVariant, string> = {
  default: "",
  alert: "border-destructive/25 ring-destructive/10",
  warning: "border-amber-200/80 dark:border-amber-900/60",
};

export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  variant = "default",
  contentClassName,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        "shadow-sm border-border/60",
        variantStyles[variant],
        className,
      )}
    >
      <CardHeader className="flex-row items-center justify-between border-b border-border/50 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent
        className={cn(
          noPadding ? "p-0" : "pt-4",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

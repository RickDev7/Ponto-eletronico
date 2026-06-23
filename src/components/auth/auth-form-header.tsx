import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface AuthFormHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function AuthFormHeader({ title, description, className }: AuthFormHeaderProps) {
  return (
    <header className={cn("mb-8 space-y-2", className)}>
      <Link
        href="/"
        className="mb-6 hidden text-lg font-semibold tracking-tight text-foreground lg:inline-block"
      >
        FeldOps
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {title}
      </h1>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

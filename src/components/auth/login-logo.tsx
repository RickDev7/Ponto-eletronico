import { cn } from "@/lib/utils";

interface LoginLogoProps {
  className?: string;
  showName?: boolean;
}

export function LoginLogo({ className, showName = true }: LoginLogoProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl",
          "bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.4)]",
        )}
      >
        <span className="text-lg font-bold tracking-tight text-zinc-950">F</span>
      </div>
      {showName && (
        <span className="text-xl font-semibold tracking-[-0.02em] text-white">
          FeldOps
        </span>
      )}
    </div>
  );
}

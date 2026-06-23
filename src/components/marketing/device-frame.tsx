import { cn } from "@/lib/utils";
import { DeviceFrameImage } from "@/components/marketing/device-frame-image";
import type { ReactNode } from "react";

export function DeviceFrame({
  children,
  className,
  label = "FeldOps",
  imageSrc,
  imageAlt,
}: {
  children?: ReactNode;
  className?: string;
  label?: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-ds-soft",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto flex h-7 min-w-0 max-w-[12rem] flex-1 items-center justify-center rounded-md bg-muted px-3">
          <span className="truncate text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
      <div className="bg-muted/30">
        {imageSrc ? (
          <DeviceFrameImage src={imageSrc} alt={imageAlt ?? "FeldOps product screenshot"} fallback={children} />
        ) : (
          <div className="p-1">{children}</div>
        )}
      </div>
    </div>
  );
}

export function MobileFrame({
  children,
  className,
  imageSrc,
  imageAlt,
}: {
  children?: ReactNode;
  className?: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-border bg-card shadow-ds-soft",
        className,
      )}
    >
      <div className="flex justify-center bg-card py-2">
        <span className="h-1 w-12 rounded-full bg-border" />
      </div>
      <div className="bg-muted/30">
        {imageSrc ? (
          <DeviceFrameImage src={imageSrc} alt={imageAlt ?? "FeldOps mobile screenshot"} fallback={children} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

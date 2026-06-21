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
        "overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-white px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#E2E8F0]" />
          <span className="size-2.5 rounded-full bg-[#E2E8F0]" />
          <span className="size-2.5 rounded-full bg-[#E2E8F0]" />
        </div>
        <div className="mx-auto flex h-7 min-w-0 max-w-[12rem] flex-1 items-center justify-center rounded-md bg-[#F8FAFC] px-3">
          <span className="truncate text-xs text-[#64748B]">{label}</span>
        </div>
      </div>
      <div className="bg-[#F8FAFC]">
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
        "mx-auto w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-[#E2E8F0] bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex justify-center bg-white py-2">
        <span className="h-1 w-12 rounded-full bg-[#E2E8F0]" />
      </div>
      <div className="bg-[#F8FAFC]">
        {imageSrc ? (
          <DeviceFrameImage src={imageSrc} alt={imageAlt ?? "FeldOps mobile screenshot"} fallback={children} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

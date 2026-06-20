"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SharedSize, WithClassName } from "./types";

export type ModalSize = SharedSize | "xl" | "full";

export interface ModalWrapperProps extends WithClassName {
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Modal title — required for accessibility. */
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional trigger element — omit for fully controlled usage. */
  trigger?: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-[min(96vw,64rem)]",
};

/**
 * Opinionated modal shell built on Shadcn Dialog.
 * Handles title, description, body and footer slots with consistent spacing.
 */
export function ModalWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  size = "md",
  showCloseButton = true,
  className,
}: ModalWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(sizeStyles[size], className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-1">{children}</div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

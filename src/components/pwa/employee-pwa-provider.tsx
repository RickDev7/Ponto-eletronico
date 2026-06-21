"use client";

import { useOfflineStatus } from "@/hooks/employee/use-offline-status";
import { useOfflineSync } from "@/hooks/employee/use-offline-sync";
import { OfflineBadge } from "@/components/pwa/offline-badge";

interface EmployeePwaProviderProps {
  slug: string;
  children: React.ReactNode;
}

export function EmployeePwaProvider({ slug, children }: EmployeePwaProviderProps) {
  const { offline } = useOfflineStatus();
  const { pendingCount, syncing } = useOfflineSync(slug);

  return (
    <>
      <OfflineBadge offline={offline} pendingCount={pendingCount} syncing={syncing} />
      {children}
    </>
  );
}

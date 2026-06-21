"use client";

import { createContext, useContext } from "react";
import { useEmployeeUnreadCountSubscription } from "@/hooks/employee/use-employee-notifications";

const EmployeeUnreadCountContext = createContext<number>(0);

interface EmployeeUnreadCountProviderProps {
  companyId: string;
  employeeId: string;
  initialCount?: number;
  children: React.ReactNode;
}

export function EmployeeUnreadCountProvider({
  companyId,
  employeeId,
  initialCount = 0,
  children,
}: EmployeeUnreadCountProviderProps) {
  const unreadCount = useEmployeeUnreadCountSubscription(
    companyId,
    employeeId,
    initialCount,
  );

  return (
    <EmployeeUnreadCountContext.Provider value={unreadCount}>
      {children}
    </EmployeeUnreadCountContext.Provider>
  );
}

export function useEmployeeUnreadCount() {
  return useContext(EmployeeUnreadCountContext);
}

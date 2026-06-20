import type { CompanyWithMembership } from "@/types/queries";
import type { Company } from "@/types";

export function resolveMembershipCompany(
  company: CompanyWithMembership["company"],
): Company | null {
  if (!company) return null;
  const row = Array.isArray(company) ? company[0] : company;
  return row ?? null;
}

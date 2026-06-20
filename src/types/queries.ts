import type { Database } from "@/types/database";

export type Tables = Database["public"]["Tables"];

export type CompanyRow = Tables["companies"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];
export type MemberRow = Tables["company_members"]["Row"];

export type CompanyWithMembership = MemberRow & {
  company: CompanyRow;
};

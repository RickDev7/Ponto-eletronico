import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyMember, Employee, Profile } from "@/types/database";
import type { CompanyWithMembership } from "@/types/queries";
import type { User } from "@supabase/supabase-js";

export async function getSession(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getUserCompanies(
  userId: string,
): Promise<CompanyWithMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("*, company:companies(*)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) return [];
  return (data ?? []) as CompanyWithMembership[];
}

export async function getMembership(
  userId: string,
  companyId: string,
): Promise<CompanyMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return data as CompanyMember;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Company;
}

export async function getEmployeeForMember(
  companyId: string,
  memberId: string,
): Promise<Employee | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Employee;
}

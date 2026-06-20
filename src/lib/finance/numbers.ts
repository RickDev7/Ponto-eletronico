import type { SupabaseClient } from "@supabase/supabase-js";

export async function nextDocumentNumber(
  supabase: SupabaseClient,
  companyId: string,
  docType: "quote" | "invoice" | "contract",
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix =
    docType === "quote" ? "Q" : docType === "contract" ? "C" : "INV";

  const { data: existing } = await supabase
    .from("finance_document_counters")
    .select("last_number")
    .eq("company_id", companyId)
    .eq("doc_type", docType)
    .eq("year", year)
    .maybeSingle();

  const nextNum = (existing?.last_number ?? 0) + 1;

  await supabase.from("finance_document_counters").upsert(
    {
      company_id: companyId,
      doc_type: docType,
      year,
      last_number: nextNum,
    },
    { onConflict: "company_id,doc_type,year" },
  );

  return `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;
}

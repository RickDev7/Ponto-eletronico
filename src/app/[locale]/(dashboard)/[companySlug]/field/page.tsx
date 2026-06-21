import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FieldIndexPage({ params }: PageProps) {
  const { companySlug } = await params;
  redirect(ROUTES.fieldSchedule(companySlug));
}

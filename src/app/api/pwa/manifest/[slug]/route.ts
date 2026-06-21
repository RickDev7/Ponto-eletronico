import { NextResponse } from "next/server";
import { buildEmployeeManifest } from "@/app/manifest";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  let companyName: string | undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("companies")
      .select("name")
      .eq("slug", slug)
      .maybeSingle();
    companyName = data?.name ?? undefined;
  } catch {
    /* public manifest still works without DB */
  }

  const manifest = buildEmployeeManifest({
    slug,
    companyName,
    startUrl: `/${slug}/mobile`,
  });

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

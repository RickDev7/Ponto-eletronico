import { requirePlatformAdmin } from "@/lib/auth/platform-guards";
import { PlatformShell } from "@/components/platform/platform-shell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePlatformAdmin();

  return <PlatformShell ctx={ctx}>{children}</PlatformShell>;
}

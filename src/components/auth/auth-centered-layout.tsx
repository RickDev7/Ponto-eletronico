import { AuthShell } from "@/components/auth/auth-shell";

interface AuthCenteredLayoutProps {
  children: React.ReactNode;
}

/** @deprecated Import AuthShell directly — kept for existing auth pages. */
export async function AuthCenteredLayout({ children }: AuthCenteredLayoutProps) {
  return <AuthShell>{children}</AuthShell>;
}

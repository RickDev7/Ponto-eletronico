import { getTranslations } from "next-intl/server";

interface AuthCenteredLayoutProps {
  children: React.ReactNode;
}

/** Centered auth shell for register, reset, and related flows. */
export async function AuthCenteredLayout({ children }: AuthCenteredLayoutProps) {
  const t = await getTranslations("auth.branding");

  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border/60 bg-muted/20 p-12">
        <span className="text-lg font-semibold tracking-tight text-foreground/90">
          FeldOps
        </span>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-foreground">
            {t("tagline")}
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{t("multiTenant")}</span>
          <span className="text-border">·</span>
          <span>{t("offline")}</span>
          <span className="text-border">·</span>
          <span>{t("gdpr")}</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-semibold tracking-tight">FeldOps</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

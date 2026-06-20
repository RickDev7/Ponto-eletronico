"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { themeConfig } from "@/config/theme";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={themeConfig.attribute}
      defaultTheme={themeConfig.defaultTheme}
      themes={[...themeConfig.themes]}
      enableSystem={themeConfig.enableSystem}
      disableTransitionOnChange={themeConfig.disableTransitionOnChange}
      storageKey={themeConfig.storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

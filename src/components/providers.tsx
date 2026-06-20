"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme";
import { useEffect, useState, type ComponentType } from "react";

const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  { ssr: false },
);

function QueryDevtools() {
  const [Devtools, setDevtools] = useState<ComponentType<{
    initialIsOpen?: boolean;
  }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void import("@tanstack/react-query-devtools").then((mod) => {
      setDevtools(() => mod.ReactQueryDevtools);
    });
  }, []);

  if (!Devtools) return null;
  return <Devtools initialIsOpen={false} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
      <QueryDevtools />
    </QueryClientProvider>
  );
}

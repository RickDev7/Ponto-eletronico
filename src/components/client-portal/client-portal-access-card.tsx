"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { grantClientPortalAccess } from "@/actions/client-portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared";

interface ClientPortalAccessCardProps {
  slug: string;
  clientId: string;
  defaultEmail?: string | null;
}

export function ClientPortalAccessCard({
  slug,
  clientId,
  defaultEmail,
}: ClientPortalAccessCardProps) {
  const t = useTranslations("clientPortal.access");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [isPending, startTransition] = useTransition();

  function handleGrant() {
    startTransition(async () => {
      const result = await grantClientPortalAccess(slug, { clientId, email });
      if (!result.success) {
        toast.error(result.error ?? t("error"));
        return;
      }
      toast.success(t("success"));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <div className="space-y-2">
          <Label htmlFor="portal-email">{t("email")}</Label>
          <Input
            id="portal-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </div>
        <Button onClick={handleGrant} disabled={isPending || !email}>
          {t("grant")}
        </Button>
      </CardContent>
    </Card>
  );
}

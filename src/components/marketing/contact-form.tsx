"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const t = useTranslations("marketing.contact");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await new Promise((r) => setTimeout(r, 600));
    setPending(false);
    toast.success(t("success"));
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-2">
        <Label htmlFor="contact-name" className="text-[#0F172A]">
          {t("name")}
        </Label>
        <Input
          id="contact-name"
          name="name"
          required
          className="h-12 border-[#E2E8F0] bg-[#F8FAFC]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-email" className="text-[#0F172A]">
          {t("email")}
        </Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          className="h-12 border-[#E2E8F0] bg-[#F8FAFC]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message" className="text-[#0F172A]">
          {t("message")}
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          className="border-[#E2E8F0] bg-[#F8FAFC]"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
      >
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}

import { Briefcase, CalendarDays, Home, MessageSquare, UserCircle2 } from "lucide-react";
import { ROUTES } from "@/config/constants";

export const EMPLOYEE_NAV_ITEMS = [
  {
    labelKey: "home",
    href: (slug: string) => ROUTES.mobile(slug),
    icon: Home,
    prefetch: true,
    badgeKey: null as null | "messages",
    match: (pathname: string, slug: string) =>
      pathname === ROUTES.mobile(slug) || pathname.endsWith("/mobile"),
  },
  {
    labelKey: "schedule",
    href: (slug: string) => ROUTES.mobileSchedule(slug),
    icon: CalendarDays,
    prefetch: true,
    badgeKey: null,
    match: (pathname: string) => pathname.includes("/mobile/schedule"),
  },
  {
    labelKey: "jobs",
    href: (slug: string) => ROUTES.mobileJobs(slug),
    icon: Briefcase,
    prefetch: true,
    badgeKey: null,
    match: (pathname: string) =>
      pathname.includes("/mobile/jobs") || pathname.includes("/mobile/services"),
  },
  {
    labelKey: "messages",
    href: (slug: string) => ROUTES.mobileMessages(slug),
    icon: MessageSquare,
    prefetch: false,
    badgeKey: "messages" as const,
    match: (pathname: string) =>
      pathname.includes("/mobile/messages") || pathname.includes("/mobile/notifications"),
  },
  {
    labelKey: "profile",
    href: (slug: string) => ROUTES.mobileProfile(slug),
    icon: UserCircle2,
    prefetch: false,
    badgeKey: null,
    match: (pathname: string) => pathname.includes("/mobile/profile"),
  },
] as const;

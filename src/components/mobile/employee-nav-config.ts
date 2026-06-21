import { Bell, CalendarDays, Clock, Home, UserCircle2 } from "lucide-react";
import { ROUTES } from "@/config/constants";

export const EMPLOYEE_NAV_ITEMS = [
  {
    labelKey: "home",
    href: (slug: string) => ROUTES.mobile(slug),
    icon: Home,
    prefetch: true,
    match: (pathname: string, slug: string) =>
      pathname === ROUTES.mobile(slug) || pathname.endsWith("/mobile"),
  },
  {
    labelKey: "schedule",
    href: (slug: string) => ROUTES.mobileSchedule(slug),
    icon: CalendarDays,
    prefetch: true,
    match: (pathname: string) => pathname.includes("/mobile/schedule"),
  },
  {
    labelKey: "hours",
    href: (slug: string) => ROUTES.mobileHours(slug),
    icon: Clock,
    prefetch: true,
    match: (pathname: string) => pathname.includes("/mobile/hours"),
  },
  {
    labelKey: "notifications",
    href: (slug: string) => ROUTES.mobileNotifications(slug),
    icon: Bell,
    prefetch: false,
    match: (pathname: string) => pathname.includes("/mobile/notifications"),
  },
  {
    labelKey: "profile",
    href: (slug: string) => ROUTES.mobileProfile(slug),
    icon: UserCircle2,
    prefetch: false,
    match: (pathname: string) => pathname.includes("/mobile/profile"),
  },
] as const;

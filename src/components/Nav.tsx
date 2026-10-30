"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "./LinkPending";

const I = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  list: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
};

const TABS = [
  { href: "/", label: "홈", icon: I.home, match: (p: string) => p === "/" },
  {
    href: "/events",
    label: "리스트",
    icon: I.list,
    match: (p: string) => p.startsWith("/events") || p.startsWith("/tasks") || p.startsWith("/payments"),
  },
  { href: "/budget", label: "예산", icon: I.heart, match: (p: string) => p.startsWith("/budget") },
  { href: "/settings", label: "마이", icon: I.user, match: (p: string) => p.startsWith("/settings") },
];

/** 아래 탭 (데스크톱에서는 위에 붙음) */
export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.startsWith("/start")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b md:pb-0">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold md:flex-row md:justify-center md:gap-1.5 md:py-3 md:text-[13px] ${
                  active ? "text-ink" : "text-faint"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="23"
                  height="23"
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.12 : 0}
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="md:h-[18px] md:w-[18px]"
                  aria-hidden
                >
                  {t.icon}
                </svg>
                {t.label}
                <LinkPending className="rounded-none" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

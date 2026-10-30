"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "./LinkPending";

const I = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
};

const TABS = [
  { href: "/", label: "홈", icon: I.home, match: (p: string) => p === "/" || p.startsWith("/tasks") },
  { href: "/events", label: "이벤트", icon: I.calendar, match: (p: string) => p.startsWith("/events") || p.startsWith("/payments") },
  { href: "/settings", label: "설정", icon: I.gear, match: (p: string) => p.startsWith("/settings") },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.startsWith("/start")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:sticky md:top-0 md:bottom-auto md:pt-3 md:pb-0">
      <ul className="mx-auto grid max-w-xl grid-cols-3 rounded-[22px] border border-white/60 bg-card/85 p-1 shadow-[0_8px_28px_rgb(123_140_255/0.18)] backdrop-blur-md dark:border-white/5">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 rounded-[18px] pt-2 pb-1.5 text-[11px] font-semibold md:flex-row md:justify-center md:gap-1.5 md:py-2.5 md:text-[13px] ${
                  active ? "bg-save-soft text-save" : "text-faint"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="md:h-[18px] md:w-[18px]"
                  aria-hidden
                >
                  {t.icon}
                </svg>
                {t.label}
                <LinkPending className="rounded-[18px]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil, fromYmd, timeLabel, ymd } from "@/lib/dates";
import { won } from "@/lib/money";
import { getCategories } from "@/lib/categories";
import { getMe } from "@/lib/me";
import { kakaoEnabled } from "@/lib/session";
import { scheduleItems, upcoming } from "@/lib/upcoming";
import { Calendar, type CalItem } from "@/components/Calendar";
import { MePicker } from "@/components/MePicker";

export const dynamic = "force-dynamic";

/** 홈: Our Wedding 머리말 + 캘린더(고른 날 일정·추가) + 그 달 일정. ?date= 면 그날을 골라 둔 채로 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const now = new Date();
  const { date } = await searchParams;
  const initial = typeof date === "string" && fromYmd(date) ? date : undefined;
  const [wedding, events, me, cats] = await Promise.all([getWedding(), getEvents(), getMe(), getCategories()]);
  if (!wedding) redirect("/start");

  const items = scheduleItems(events);
  const calItems: CalItem[] = items.map((i) => ({
    key: `${i.kind}-${i.id}`,
    id: i.id,
    ymd: ymd(i.date),
    kind: i.kind,
    label: i.title,
    category: i.category,
    eventTitle: i.eventTitle,
    time: timeLabel(i.startTime, i.endTime),
    place: i.place ?? undefined,
    amount: i.amount ? won(i.amount) : undefined,
    href: `/events/${i.eventId}`,
    done: i.done,
  }));
  const overdue = upcoming(items, now).filter((i) => i.days < 0);
  const dday = wedding.date ? daysUntil(wedding.date, now) : null;
  const names = wedding.names.length === 2 ? `${wedding.names[0]} ♥ ${wedding.names[1]}` : null;

  return (
    <main className="space-y-6">
      <header className="flex items-start gap-3 pt-2">
        <div className="min-w-0 flex-1">
          <h1 className="serif flex items-center gap-2 text-[34px] leading-tight">
            Our Wedding
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-sub" aria-hidden>
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          </h1>
          <p className="mt-1 truncate text-[13px] text-sub">
            {wedding.date ? (
              <>
                <b className="num font-semibold text-ink">{dday! > 0 ? `D-${dday}` : dday === 0 ? "D-Day" : `결혼 ${-dday! + 1}일째`}</b>
                {" · "}
                {names ? `${names} · ` : ""}
                {dateLabel(wedding.date, now)}
                {wedding.place && ` · ${wedding.place}`}
              </>
            ) : (
              <>
                지금, 우리의 결혼을 준비하는 중이에요 ·{" "}
                <Link href="/settings/wedding?back=/" className="font-semibold text-save underline underline-offset-2">
                  결혼식 날짜 정하기
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href="/events" aria-label="이벤트 찾기" className="p-1.5 text-ink">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
        </Link>
        <Link href="/settings" aria-label="설정" className="p-1.5 text-ink">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </header>

      {!kakaoEnabled() && !me && <MePicker names={wedding.names} />}

      {overdue.length > 0 && (
        <Link href={`/events/${overdue[0].eventId}`} className="card flex items-center gap-3 !py-3">
          <span className="rounded-full bg-spend-soft px-2 py-0.5 text-[11px] font-bold text-spend">밀림 {overdue.length}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
            {overdue[0].title}
            {overdue.length > 1 && <span className="font-normal text-sub"> 외 {overdue.length - 1}개</span>}
          </span>
          <span className="text-faint" aria-hidden>›</span>
        </Link>
      )}

      <Calendar items={calItems} today={ymd(now)} initial={initial} categories={cats.map((c) => ({ name: c.name, color: c.color }))} />
    </main>
  );
}

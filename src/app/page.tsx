import Link from "next/link";
import { redirect } from "next/navigation";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil, ymd } from "@/lib/dates";
import { colorOf } from "@/lib/meta";
import { getCategories } from "@/lib/categories";
import { getMe } from "@/lib/me";
import { kakaoEnabled } from "@/lib/session";
import { scheduleItems, upcoming } from "@/lib/upcoming";
import { Calendar, type CalItem } from "@/components/Calendar";
import { MePicker } from "@/components/MePicker";

export const dynamic = "force-dynamic";

/** 홈 = 캘린더. 위에 D-day·진행을 한 줄로, 밀린 일정이 있으면 첫 번째로 바로 가는 링크 */
export default async function HomePage() {
  const now = new Date();
  const [wedding, events, me, cats] = await Promise.all([getWedding(), getEvents(), getMe(), getCategories()]);
  if (!wedding) redirect("/start");

  const items = scheduleItems(events);
  const calItems: CalItem[] = items.map((i) => ({
    key: `${i.kind}-${i.id}`,
    id: i.id,
    ymd: ymd(i.date),
    kind: i.kind,
    label: i.title,
    sub: i.kind === "event" ? i.category : i.eventTitle,
    href: `/events/${i.eventId}`,
    color: colorOf(cats, i.category),
    done: i.done,
  }));
  const overdue = upcoming(items, now).filter((i) => i.days < 0);
  const done = events.filter((e) => e.done).length;
  const dday = wedding.date ? daysUntil(wedding.date, now) : null;

  return (
    <main className="space-y-5">
      <header className="hero flex items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-cover-sub">
            {wedding.names.length === 2 ? `${wedding.names[0]} ♥ ${wedding.names[1]}` : "우리 결혼식"}
            {wedding.date && ` · ${dateLabel(wedding.date, now)}`}
            {wedding.place && ` · ${wedding.place}`}
          </p>
          {wedding.date ? (
            <p className="num text-[24px] leading-tight font-extrabold">
              {dday! > 0 ? `D-${dday}` : dday === 0 ? "오늘이에요!" : `결혼 ${-dday! + 1}일째`}
            </p>
          ) : (
            <Link href="/settings/wedding?back=/" className="mt-1 inline-block text-[14px] font-bold underline underline-offset-2">
              결혼식 날짜 정하기
            </Link>
          )}
        </div>
        {events.length > 0 && (
          <Link href="/events" className="shrink-0 text-right">
            <span className="block text-[11px] text-cover-sub">준비 진행</span>
            <span className="num text-[13px] text-cover-sub">
              <b className="text-[18px] text-cover-ink">{done}</b> / {events.length}
            </span>
          </Link>
        )}
      </header>

      {!kakaoEnabled() && !me && <MePicker names={wedding.names} />}

      {overdue.length > 0 && (
        <Link href={`/events/${overdue[0].eventId}`} className="card flex items-center gap-3 !py-3 ring-1 ring-spend/30">
          <span className="rounded-md bg-spend-soft px-1.5 py-0.5 text-[11px] font-bold text-spend">밀림 {overdue.length}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
            {overdue[0].title}
            {overdue.length > 1 && <span className="font-normal text-sub"> 외 {overdue.length - 1}개</span>}
          </span>
          <span className="text-faint" aria-hidden>›</span>
        </Link>
      )}

      <Calendar items={calItems} today={ymd(now)} />
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil } from "@/lib/dates";
import { getMe } from "@/lib/me";
import { kakaoEnabled } from "@/lib/session";
import { scheduleItems, upcoming } from "@/lib/upcoming";
import { MePicker } from "@/components/MePicker";
import { ScheduleRow } from "@/components/ScheduleRow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [wedding, events, me] = await Promise.all([getWedding(), getEvents(), getMe()]);
  if (!wedding) redirect("/start");

  const done = events.filter((e) => e.done).length;
  const soon = upcoming(scheduleItems(events), now);
  const overdue = soon.filter((i) => i.days < 0).length;
  const next = events.find((e) => !e.done);
  const dday = wedding.date ? daysUntil(wedding.date, now) : null;

  return (
    <main className="space-y-7">
      <section className="hero p-5">
        <p className="text-[13px] text-cover-sub">{wedding.names.length === 2 ? `${wedding.names[0]} ♥ ${wedding.names[1]}` : "우리 결혼식"}</p>
        {wedding.date ? (
          <>
            <p className="num mt-1 text-[34px] leading-tight font-extrabold">
              {dday! > 0 ? `D-${dday}` : dday === 0 ? "오늘이에요!" : `결혼 ${-dday! + 1}일째`}
            </p>
            <p className="mt-1 text-[14px] text-cover-sub">
              {dateLabel(wedding.date, now)}
              {wedding.place && ` · ${wedding.place}`}
            </p>
          </>
        ) : (
          <Link href="/settings/wedding?back=/" className="mt-2 inline-block rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-bold text-save">
            결혼식 날짜 정하기
          </Link>
        )}
        {events.length > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[13px] text-cover-sub">
              <span>준비 진행</span>
              <span className="num">
                <b className="text-[17px] text-cover-ink">{done}</b> / {events.length}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${(done / events.length) * 100}%` }} />
            </div>
          </div>
        )}
      </section>

      {!kakaoEnabled() && !me && <MePicker names={wedding.names} />}

      <section>
        <h2 className="section-title">
          곧 할 일
          <small>{overdue ? `밀린 것 ${overdue}개 · 30일 안` : "30일 안"}</small>
        </h2>
        {soon.length > 0 ? (
          <ul className="card ledger !py-1">
            {soon.map((item) => (
              <ScheduleRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        ) : (
          <div className="card space-y-2 text-[14px] text-sub">
            <p>30일 안에 잡힌 일정이 없어요.</p>
            {next && (
              <p>
                다음 이벤트는{" "}
                <Link href={`/events/${next.id}`} className="font-semibold text-save">
                  {next.title}
                </Link>
                {next.date ? ` (${dateLabel(next.date, now)})` : "예요. 날짜를 정해 볼까요?"}
              </p>
            )}
            {events.length === 0 && (
              <Link href="/events/new" className="font-semibold text-save">
                첫 이벤트 만들기
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

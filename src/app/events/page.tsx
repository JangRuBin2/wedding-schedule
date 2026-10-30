import Link from "next/link";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil, dueLabel, shortDate, ymd } from "@/lib/dates";
import { CATEGORIES, categoryColor } from "@/lib/meta";
import { scheduleItems } from "@/lib/upcoming";
import { Calendar, type CalItem } from "@/components/Calendar";
import { CategoryDot } from "@/components/CategoryDot";
import { LinkPending } from "@/components/LinkPending";
import { OptimisticCheck } from "@/components/OptimisticCheck";
import { SubmitButton } from "@/components/SubmitButton";
import { ViewSwitch } from "@/components/ViewSwitch";
import { fillDates, toggleEvent } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ view?: string | string[]; cat?: string | string[] }>;
const one = (v: unknown) => (typeof v === "string" ? v : undefined);

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = one(sp.view) === "calendar" ? "calendar" : "list";
  const cat = CATEGORIES.some((c) => c.name === one(sp.cat)) ? one(sp.cat)! : null;
  const now = new Date();
  const [all, wedding] = await Promise.all([getEvents(), getWedding()]);
  const events = cat ? all.filter((e) => e.category === cat) : all;

  const calItems: CalItem[] = scheduleItems(events).map((i) => ({
    key: `${i.kind}-${i.id}`,
    ymd: ymd(i.date),
    kind: i.kind,
    label: i.title,
    sub: i.kind === "event" ? i.category : i.eventTitle,
    href: `/events/${i.eventId}`,
    color: categoryColor(i.category),
    done: i.done,
  }));
  const canFill = !!wedding?.date && all.some((e) => !e.date && e.templateKey);
  const filterHref = (c: string | null) => {
    const q = new URLSearchParams();
    if (view === "calendar") q.set("view", "calendar");
    if (c) q.set("cat", c);
    const s = q.toString();
    return s ? `/events?${s}` : "/events";
  };

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold">이벤트</h1>
        <Link href="/events/new" className="btn relative !px-4 !py-2">
          + 이벤트
          <LinkPending />
        </Link>
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="카테고리">
        <FilterChip href={filterHref(null)} active={!cat}>
          전체 {all.length}
        </FilterChip>
        {CATEGORIES.map((c) => {
          const n = all.filter((e) => e.category === c.name).length;
          return n ? (
            <FilterChip key={c.name} href={filterHref(c.name)} active={cat === c.name}>
              <CategoryDot name={c.name} />
              {c.name} {n}
            </FilterChip>
          ) : null;
        })}
      </nav>

      {canFill && (
        <form action={fillDates} className="card flex items-center justify-between gap-3 !py-3.5">
          <p className="text-[13px] leading-snug text-sub">날짜가 없는 기본 이벤트에 결혼식 날짜 기준 추천 일정을 넣을 수 있어요</p>
          <SubmitButton pendingText="채우는 중…" className="shrink-0 whitespace-nowrap">추천 일정 채우기</SubmitButton>
        </form>
      )}

      <ViewSwitch
        initial={view}
        views={[
          {
            key: "list",
            label: "리스트",
            content:
              events.length > 0 ? (
                <ol className="card !py-2">
                  {events.map((e, i) => {
                    const tasksDone = e.tasks.filter((t) => t.done).length;
                    const days = e.date ? daysUntil(e.date, now) : null;
                    return (
                      <li key={e.id} className="relative flex gap-3">
                        {i < events.length - 1 && <span className="absolute top-10 bottom-0 left-[15px] w-[2px] bg-line" aria-hidden />}
                        <div className="relative z-[1] py-2">
                          <OptimisticCheck variant="step" done={e.done} action={toggleEvent.bind(null, e.id)} label={e.title} number={i + 1} />
                        </div>
                        <Link href={`/events/${e.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[15px] font-semibold ${e.done ? "text-sub line-through decoration-1" : ""}`}>
                              {e.title}
                            </span>
                            <span className="num flex items-center gap-1.5 truncate text-[12px] text-sub">
                              <CategoryDot name={e.category} className="h-1.5 w-1.5" />
                              {e.done
                                ? `완료 ${[e.doneBy, e.doneAt && shortDate(e.doneAt)].filter(Boolean).join(" · ")}`
                                : e.date
                                  ? `${dateLabel(e.date, now)} · ${dueLabel(days!)}`
                                  : "날짜 미정"}
                              {e.tasks.length > 0 && ` · 할 일 ${tasksDone}/${e.tasks.length}`}
                              {e.dues.some((d) => !d.done) && ` · 돈 낼 날 ${e.dues.filter((d) => !d.done).length}`}
                              {e.memo && " · 메모"}
                            </span>
                          </span>
                          <span className="text-faint" aria-hidden>›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="card text-center text-[14px] text-sub">{cat ? `${cat} 이벤트가 없어요` : "아직 이벤트가 없어요"}</p>
              ),
          },
          { key: "calendar", label: "캘린더", content: <Calendar items={calItems} today={ymd(now)} /> },
        ]}
      />
    </main>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap ${
        active ? "bg-save text-white" : "bg-card text-sub shadow-[var(--shadow-card)]"
      }`}
    >
      {children}
      <LinkPending className="rounded-full" />
    </Link>
  );
}

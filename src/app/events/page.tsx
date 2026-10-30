import Link from "next/link";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { colorOf } from "@/lib/meta";
import { getCategories } from "@/lib/categories";
import { CategoryDot } from "@/components/CategoryDot";
import { LinkPending } from "@/components/LinkPending";
import { EventManager, type ManagedEvent } from "@/components/EventManager";
import { SubmitButton } from "@/components/SubmitButton";
import { fillDates } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ cat?: string | string[] }>;
const one = (v: unknown) => (typeof v === "string" ? v : undefined);

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const now = new Date();
  const [all, wedding, cats] = await Promise.all([getEvents(), getWedding(), getCategories()]);
  const cat = cats.some((c) => c.name === one(sp.cat)) ? one(sp.cat)! : null;
  const events = cat ? all.filter((e) => e.category === cat) : all;

  const canFill = !!wedding?.date && all.some((e) => !e.date && e.templateKey);
  const filterHref = (c: string | null) => (c ? `/events?cat=${encodeURIComponent(c)}` : "/events");
  const rows: ManagedEvent[] = events.map((e) => {
    const days = e.date ? daysUntil(e.date, now) : null;
    const tasksDone = e.tasks.filter((t) => t.done).length;
    const openDues = e.dues.filter((d) => !d.done).length;
    return {
      id: e.id,
      title: e.title,
      color: colorOf(cats, e.category),
      done: e.done,
      overdue: !e.done && days != null && days < 0,
      sub: [
        e.category,
        e.done
          ? `완료 ${[e.doneBy, e.doneAt && shortDate(e.doneAt)].filter(Boolean).join(" · ")}`
          : e.date
            ? `${dateLabel(e.date, now)} · ${dueLabel(days!)}`
            : "날짜 미정",
        e.tasks.length > 0 && `할 일 ${tasksDone}/${e.tasks.length}`,
        openDues > 0 && `결제 ${openDues}`,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold">리스트</h1>
        <Link href="/events/new" className="btn relative !px-4 !py-2">
          + 이벤트
          <LinkPending />
        </Link>
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="카테고리">
        <FilterChip href={filterHref(null)} active={!cat}>
          전체 {all.length}
        </FilterChip>
        {cats.map((c) => {
          const n = all.filter((e) => e.category === c.name).length;
          return n ? (
            <FilterChip key={c.name} href={filterHref(c.name)} active={cat === c.name}>
              <CategoryDot color={c.color} />
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

      {events.length > 0 ? (
        <EventManager events={rows} />
      ) : (
        <p className="card text-center text-[14px] text-sub">{cat ? `${cat} 이벤트가 없어요` : "아직 이벤트가 없어요"}</p>
      )}
    </main>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap ${
        active ? "border-save bg-save text-on-save" : "border-line bg-card text-sub"
      }`}
    >
      {children}
      <LinkPending className="rounded-full" />
    </Link>
  );
}

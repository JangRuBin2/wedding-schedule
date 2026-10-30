import Link from "next/link";
import { getEvents, getWedding } from "@/lib/data";
import { dateLabel, daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { colorOf } from "@/lib/meta";
import { getCategories } from "@/lib/categories";
import { CategoryFilter } from "@/components/CategoryFilter";
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

      <CategoryFilter options={cats.map((c) => ({ name: c.name, count: all.filter((e) => e.category === c.name).length }))} value={cat ?? ""} />

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


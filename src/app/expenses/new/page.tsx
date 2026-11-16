import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { fromYmd, ymd } from "@/lib/dates";
import { safeBack } from "@/lib/back";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EventLinkSelect } from "@/components/EventLinkSelect";
import { ExpenseForm } from "@/components/ExpenseForm";
import { WriteHeader } from "@/components/WriteHeader";

export const dynamic = "force-dynamic";

type SP = Promise<{ eventId?: string | string[]; back?: string | string[]; cat?: string | string[]; planned?: string | string[]; date?: string | string[] }>;

/**
 * 결제·지출 기록 (작성 화면). 이벤트 화면에서 오면 그 이벤트·카테고리를, 카테고리 내역에서 오면 그 카테고리를 미리 골라 둠.
 * ?planned=1 이면 '결제 예정'으로 시작. 날짜는 오늘(또는 ?date=)
 */
export default async function NewExpensePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [cats, events] = await Promise.all([
    getCategories(),
    prisma.event.findMany({ orderBy: [{ order: "asc" }], select: { id: true, title: true, category: true, date: true, done: true } }),
  ]);
  const ev = events.find((e) => e.id === sp.eventId);
  const back = safeBack(sp.back, ev ? `/events/${ev.id}` : "/budget");
  return (
    <main className="space-y-6">
      <WriteHeader
        back={back}
        backLabel="취소"
        title="결제·지출 기록"
        sub="낸 돈은 '결제 완료', 앞으로 낼 계약금·잔금은 '결제 예정'으로 적어요. 결제 예정은 나중에 '결제 완료'만 누르면 지출로 옮겨져요"
      />
      <ExpenseForm
        initial={{ date: typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : ymd(new Date()), paid: sp.planned !== "1" }}
        categoryField={<CategoryPicker categories={cats} value={ev?.category ?? (cats.some((c) => c.name === sp.cat) ? (sp.cat as string) : undefined)} />}
        eventField={<EventLinkSelect events={events} value={ev?.id} />}
      />
    </main>
  );
}

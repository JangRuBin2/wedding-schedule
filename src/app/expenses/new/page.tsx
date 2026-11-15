import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { safeBack } from "@/lib/back";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EventLinkSelect } from "@/components/EventLinkSelect";
import { ExpenseForm } from "@/components/ExpenseForm";
import { WriteHeader } from "@/components/WriteHeader";

export const dynamic = "force-dynamic";

type SP = Promise<{ eventId?: string | string[]; back?: string | string[] }>;

/** 지출 기록 (작성 화면). 이벤트 화면에서 오면 그 이벤트·카테고리를 미리 골라 둠. 결제일은 오늘로 시작 */
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
      <WriteHeader back={back} backLabel="취소" title="지출 기록" sub="실제로 쓴 돈을 적고 영수증 같은 증빙을 붙여 두세요. 예산 탭 지출에 더해져요" />
      <ExpenseForm
        initial={{ date: ymd(new Date()) }}
        categoryField={<CategoryPicker categories={cats} value={ev?.category} />}
        eventField={<EventLinkSelect events={events} value={ev?.id} />}
      />
    </main>
  );
}

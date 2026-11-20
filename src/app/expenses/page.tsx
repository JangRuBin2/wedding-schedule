import Link from "next/link";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { colorOf } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ExpenseGroupCard, type GroupView } from "@/components/ExpenseGroupCard";

export const dynamic = "force-dynamic";

type SP = Promise<{ cat?: string | string[] }>;
const one = (v: unknown) => (typeof v === "string" ? v : undefined);
const sumOf = (xs: { amount: number | null }[]) => xs.reduce((n, x) => n + (x.amount ?? 0), 0);

/**
 * 결제·지출 내역 (보기 화면). 항목(스튜디오 등)마다 카드 하나, 안에 계약금·잔금 같은 결제가 한 줄씩.
 * 낼 결제가 남은 항목은 위에 다음 낼 날 가까운 순, 다 낸 항목은 아래에 마지막 결제일 최신순.
 * 예산 탭의 카테고리를 누르면 ?cat= 으로 그 카테고리만
 */
export default async function ExpensesPage({ searchParams }: { searchParams: SP }) {
  const db = await scoped();
  const sp = await searchParams;
  const now = new Date();
  const pay = { include: { _count: { select: { receipts: { where: { ready: true } } } } } };
  const [groups, loose, cats] = await Promise.all([
    db.expenseGroup.findMany({ include: { event: { select: { title: true } }, expenses: pay } }),
    // 옛 기록(아직 항목에 안 묶임)은 결제 하나짜리 항목처럼
    db.expense.findMany({ where: { groupId: null }, include: { event: { select: { title: true } }, ...pay.include } }),
    getCategories(),
  ]);
  const all: GroupView[] = [
    ...groups.filter((g: GroupView) => g.expenses.length > 0).map((g: GroupView & { id: string }) => ({ ...g, key: g.id })),
    ...loose.map((x: GroupView["expenses"][number] & { title: string; category: string; event: { title: string } | null }) => ({
      key: x.id,
      title: x.title,
      category: x.category,
      event: x.event,
      expenses: [{ ...x, label: "전액" }],
    })),
  ];
  const known = cats.some((c) => c.name === one(sp.cat));
  const cat = known ? one(sp.cat)! : null;
  const list = cat ? all.filter((g) => g.category === cat) : all;
  const pays = list.flatMap((g) => g.expenses);
  const planned = pays.filter((x) => !x.paid);
  const paid = pays.filter((x) => x.paid);
  const budget = cat ? cats.find((c) => c.name === cat)?.budget ?? 0 : 0;
  const nextDue = (g: GroupView) => Math.min(...g.expenses.filter((x) => !x.paid).map((x) => x.date.getTime()));
  const lastPaid = (g: GroupView) => Math.max(...g.expenses.map((x) => x.date.getTime()));
  const open = list.filter((g) => g.expenses.some((x) => !x.paid)).sort((a, b) => nextDue(a) - nextDue(b));
  const done = list.filter((g) => g.expenses.every((x) => x.paid)).sort((a, b) => lastPaid(b) - lastPaid(a));
  const newHref = `/expenses/new?back=${encodeURIComponent(cat ? `/expenses?cat=${cat}` : "/expenses")}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}`;

  return (
    <main className="space-y-6">
      <header className="space-y-2 pt-2">
        <Link href="/budget" className="text-[13px] font-semibold text-sub">‹ 예산</Link>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">{cat ? `${cat} 결제·지출` : "결제·지출 내역"}</h1>
            <p className="num text-[13px] text-sub">
              지출 <b className="font-semibold text-ink">{won(sumOf(paid))}</b>
              {planned.length > 0 && <> · 결제 예정 <b className="font-semibold text-ink">{sumOf(planned) ? won(sumOf(planned)) : `${planned.length}건`}</b></>}
              {budget > 0 && ` · 예산 ${won(budget)}`}
            </p>
          </div>
          <Link href={newHref} className="btn shrink-0 !px-3.5 !py-2 text-[13px]">
            + 결제·지출
          </Link>
        </div>
      </header>

      <CategoryFilter
        base="/expenses"
        value={cat ?? ""}
        options={cats.map((c) => ({ name: c.name, count: all.filter((g) => g.category === c.name).length }))}
      />

      {list.length === 0 ? (
        <Link href={newHref} className="card block text-[14px] text-sub">
          {cat ? `${cat}에 기록된 결제·지출이 없어요.` : "낼 돈(계약금·잔금 날짜)과 쓴 돈을 한곳에 적어 두세요."}{" "}
          <b className="font-semibold text-save">기록하기 ›</b>
        </Link>
      ) : (
        <>
          {open.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="section-title">
                결제 남음 <small className="num">{sumOf(planned) ? `${won(sumOf(planned))} 예정` : `금액 미정 ${planned.length}건`}</small>
              </h2>
              {open.map((g) => (
                <ExpenseGroupCard key={g.key} g={g} color={colorOf(cats, g.category)} now={now} />
              ))}
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="section-title">
                결제 끝 <small className="num">{won(sumOf(done.flatMap((g) => g.expenses)))}</small>
              </h2>
              {done.map((g) => (
                <ExpenseGroupCard key={g.key} g={g} color={colorOf(cats, g.category)} now={now} />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

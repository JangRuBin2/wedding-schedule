import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { colorOf } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ExpenseRow } from "@/components/ExpenseRow";

export const dynamic = "force-dynamic";

type SP = Promise<{ cat?: string | string[] }>;
const one = (v: unknown) => (typeof v === "string" ? v : undefined);
const sumOf = (xs: { amount: number | null }[]) => xs.reduce((n, x) => n + (x.amount ?? 0), 0);

/**
 * 결제·지출 내역 (보기 화면). 낼 예정은 위에 날짜순, 낸 돈은 결제일 최신순으로 달마다 묶고 합계.
 * 예산 탭의 카테고리를 누르면 ?cat= 으로 그 카테고리만
 */
export default async function ExpensesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const now = new Date();
  const [all, cats] = await Promise.all([
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { event: { select: { title: true } }, _count: { select: { receipts: { where: { ready: true } } } } },
    }),
    getCategories(),
  ]);
  const known = cats.some((c) => c.name === one(sp.cat));
  const cat = known ? one(sp.cat)! : null;
  const list = cat ? all.filter((x) => x.category === cat) : all;
  const planned = list.filter((x) => !x.paid).reverse(); // 낼 날 가까운 것부터
  const paid = list.filter((x) => x.paid);
  const budget = cat ? cats.find((c) => c.name === cat)?.budget ?? 0 : 0;
  const months = new Map<string, typeof paid>();
  for (const x of paid) {
    const k = ymd(x.date).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), x]);
  }
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
        options={cats.map((c) => ({ name: c.name, count: all.filter((x) => x.category === c.name).length }))}
      />

      {list.length === 0 ? (
        <Link href={newHref} className="card block text-[14px] text-sub">
          {cat ? `${cat}에 기록된 결제·지출이 없어요.` : "낼 돈(계약금·잔금 날짜)과 쓴 돈을 한곳에 적어 두세요."}{" "}
          <b className="font-semibold text-save">기록하기 ›</b>
        </Link>
      ) : (
        <>
          {planned.length > 0 && (
            <section>
              <h2 className="section-title">
                결제 예정 <small className="num">{sumOf(planned) ? won(sumOf(planned)) : `금액 미정 ${planned.length}건`}</small>
              </h2>
              <ul className="card ledger !py-1">
                {planned.map((x) => (
                  <li key={x.id}>
                    <ExpenseRow x={x} color={colorOf(cats, x.category)} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {[...months].map(([month, xs]) => {
            const [y, m] = month.split("-").map(Number);
            return (
              <section key={month}>
                <h2 className="section-title">
                  {y}년 {m}월 <small className="num">{won(sumOf(xs))}</small>
                </h2>
                <ul className="card ledger !py-1">
                  {xs.map((x) => (
                    <li key={x.id}>
                      <ExpenseRow x={x} color={colorOf(cats, x.category)} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}

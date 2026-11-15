import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { colorOf } from "@/lib/meta";
import { won } from "@/lib/money";
import { ExpenseRow } from "@/components/ExpenseRow";

export const dynamic = "force-dynamic";

/** 지출 내역 (보기 화면). 결제일 최신순, 달마다 묶고 합계 */
export default async function ExpensesPage() {
  const [list, cats] = await Promise.all([
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { event: { select: { title: true } }, _count: { select: { receipts: true } } },
    }),
    getCategories(),
  ]);
  const total = list.reduce((n, x) => n + x.amount, 0);
  const months = new Map<string, typeof list>();
  for (const x of list) {
    const k = ymd(x.date).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), x]);
  }

  return (
    <main className="space-y-7">
      <header className="space-y-2 pt-2">
        <Link href="/budget" className="text-[13px] font-semibold text-sub">‹ 예산</Link>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">지출 내역</h1>
            <p className="num text-[13px] text-sub">
              {list.length}건 · 합계 <b className="font-semibold text-ink">{won(total)}</b>
            </p>
          </div>
          <Link href="/expenses/new?back=/expenses" className="btn shrink-0 !px-3.5 !py-2 text-[13px]">
            + 지출 기록
          </Link>
        </div>
      </header>

      {list.length === 0 ? (
        <Link href="/expenses/new?back=/expenses" className="card block text-[14px] text-sub">
          쓴 돈을 기록하고 영수증을 붙여 두면 나중에 찾기 쉬워요 <b className="font-semibold text-save">첫 지출 기록하기 ›</b>
        </Link>
      ) : (
        [...months].map(([month, xs]) => {
          const [y, m] = month.split("-").map(Number);
          return (
            <section key={month}>
              <h2 className="section-title">
                {y}년 {m}월 <small className="num">{won(xs.reduce((n, x) => n + x.amount, 0))}</small>
              </h2>
              <ul className="card ledger !py-1">
                {xs.map((x) => (
                  <li key={x.id}>
                    <ExpenseRow x={x} color={colorOf(cats, x.category)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}

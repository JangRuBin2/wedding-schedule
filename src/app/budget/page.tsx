import Link from "next/link";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { budgetSummary, stackPct } from "@/lib/budget";
import { colorOf, soft } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "@/components/CategoryDot";
import { ExpenseRow } from "@/components/ExpenseRow";
import { UsageBar } from "@/components/UsageBar";
import { Tip } from "@/components/Tip";

export const dynamic = "force-dynamic";

const listOf = (cat: string) => `/expenses?cat=${encodeURIComponent(cat)}`;

/** 예산 (보기). 카테고리별 예산은 작성 화면에서, 돈은 '결제·지출' 한 가지 기록에서 쌓임 (냈어요 = 지출, 아직 = 결제 예정) */
export default async function BudgetPage() {
  const db = await scoped();
  const now = new Date();
  const [cats, all] = await Promise.all([
    getCategories(),
    db.expense.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { event: { select: { title: true } }, _count: { select: { receipts: { where: { ready: true } } } } },
    }),
  ]);
  const sum = budgetSummary(
    cats,
    all.map((x) => ({ amount: x.amount, done: x.paid, category: x.category })),
  );
  const upcoming = all.filter((x) => !x.paid).slice(0, 8);
  const recent = all
    .filter((x) => x.paid)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);
  const paidCount = all.length - all.filter((x) => !x.paid).length;
  const maxUsed = Math.max(0, ...sum.rows.map((r) => r.paid + r.planned));
  const rows = sum.rows.filter((r) => r.budget > 0 || r.paid > 0 || r.planned > 0);

  return (
    <main className="space-y-7">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-bold">예산</h1>
        <span className="flex items-center gap-3">
          <Link href="/budget/edit" className="text-[13px] font-semibold text-sub">
            예산 설정
          </Link>
          <Link href="/expenses/new" className="btn !px-3 !py-1.5 text-[13px]">
            + 결제·지출
          </Link>
        </span>
      </header>

      <section className="hero space-y-4 p-5">
        <div>
          <p className="text-[13px] text-sub">총예산</p>
          <p className="num text-[28px] leading-tight font-bold">{sum.total ? won(sum.total) : "미설정"}</p>
        </div>
        {sum.total > 0 && <UsageBar rows={sum.rows} total={sum.total} />}
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="지출" value={won(sum.paid)} />
          <Stat label="결제 예정" value={won(sum.planned)} />
          <Stat label={sum.left < 0 ? "초과" : "잔액"} value={sum.total ? won(Math.abs(sum.left)) : "-"} warn={sum.left < 0} />
        </dl>
      </section>

      {sum.total === 0 && (
        <Link href="/budget/edit" className="card block text-[14px] text-sub">
          예산을 설정하면 지출과 잔액을 한눈에 볼 수 있어요 <b className="font-semibold text-save">예산 설정하기 ›</b>
        </Link>
      )}

      <section>
        <h2 className="section-title">
          카테고리별
          <Tip align="right">막대의 진한 색은 지출(낸 돈), 연한 색은 결제 예정이에요. 누르면 그 카테고리의 결제·지출 내역으로 가요</Tip>
        </h2>
        {rows.length > 0 ? (
          <ul className="card ledger !py-1">
            {rows.map((r) => {
              const [paidW, plannedW] = stackPct(r.paid, r.planned, r.budget || maxUsed);
              return (
                <li key={r.name}>
                  <Link href={listOf(r.name)} className="block space-y-2 py-3.5">
                  <div className="flex items-baseline gap-2">
                    <CategoryDot color={r.color} />
                    <span className="flex-1 text-[15px] font-semibold">{r.name}</span>
                    <span className="num text-[13px] text-sub">
                      <b className="font-semibold text-ink">{won(r.paid + r.planned)}</b>
                      {r.budget > 0 && ` / ${won(r.budget)}`}
                    </span>
                    <span className="text-faint" aria-hidden>›</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full" style={{ background: soft(r.color, 0.18) }}>
                    <span className="h-full" style={{ width: `${paidW}%`, background: r.color }} />
                    <span className="h-full" style={{ width: `${plannedW}%`, background: soft(r.color, 0.5) }} />
                  </div>
                  {r.over > 0 && <p className="text-[12px] font-semibold text-spend">예산 {won(r.over)} 초과</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-[14px] text-sub">아직 지출이 없어요</p>
        )}
      </section>

      <section>
        <h2 className="section-title">
          결제 예정
        </h2>
        {upcoming.length > 0 ? (
          <ul className="card ledger !py-1">
            {upcoming.map((x) => (
              <li key={x.id}>
                <ExpenseRow x={x} color={colorOf(cats, x.category)} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-[14px] text-sub">예정된 결제가 없어요</p>
        )}
      </section>

      <section>
        <h2 className="section-title">
          최근 지출
          <Link href="/expenses" className="text-[12px] font-semibold text-save">
            결제·지출 내역 {all.length > 0 && <span className="num">{all.length}건</span>} ›
          </Link>
        </h2>
        {recent.length > 0 ? (
          <ul className="card ledger !py-1">
            {recent.map((x) => (
              <li key={x.id}>
                <ExpenseRow x={x} color={colorOf(cats, x.category)} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/expenses/new" className="card block text-[14px] text-sub">
            {paidCount === 0 && all.length > 0 ? "결제 예정을 '결제 완료'로 바꾸면 여기에 쌓여요" : "쓴 돈을 기록하고 영수증을 붙여 두세요"}{" "}
            <b className="font-semibold text-save">기록하기 ›</b>
          </Link>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-card/70 px-2 py-2.5">
      <dt className="text-[11px] text-sub">{label}</dt>
      <dd className={`num mt-0.5 text-[14px] leading-snug font-bold ${warn ? "text-spend" : ""}`}>{value}</dd>
    </div>
  );
}

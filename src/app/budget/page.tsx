import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { budgetSummary, stackPct } from "@/lib/budget";
import { daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { colorOf, soft } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "@/components/CategoryDot";
import { UsageBar } from "@/components/UsageBar";
import { SubmitButton } from "@/components/SubmitButton";
import { toggleDue } from "../actions";

export const dynamic = "force-dynamic";

/** 예산 (보기). 카테고리별 예산은 작성 화면에서, 돈은 이벤트의 '결제'에서 쌓임 */
export default async function BudgetPage() {
  const now = new Date();
  const [cats, dues] = await Promise.all([
    getCategories(),
    prisma.due.findMany({
      where: { amount: { not: null } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { event: { select: { id: true, title: true, category: true } } },
    }),
  ]);
  const pays = dues.map((d) => ({ amount: d.amount, done: d.done, category: d.event.category }));
  const sum = budgetSummary(cats, pays);
  const upcoming = dues.filter((d) => !d.done).slice(0, 8);
  const recent = dues
    .filter((d) => d.done)
    .sort((a, b) => (b.doneAt ?? b.date).getTime() - (a.doneAt ?? a.date).getTime())
    .slice(0, 5);
  const maxUsed = Math.max(0, ...sum.rows.map((r) => r.paid + r.planned));
  const rows = sum.rows.filter((r) => r.budget > 0 || r.paid > 0 || r.planned > 0);

  return (
    <main className="space-y-7">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-bold">예산</h1>
        <Link href="/budget/edit" className="text-[13px] font-semibold text-save">
          {sum.total ? "예산 나누기" : "예산 정하기"}
        </Link>
      </header>

      <section className="hero space-y-4 p-5">
        <div>
          <p className="text-[13px] text-sub">총 예산</p>
          <p className="num text-[28px] leading-tight font-bold">{sum.total ? won(sum.total) : "아직 안 정함"}</p>
        </div>
        {sum.total > 0 && <UsageBar rows={sum.rows} total={sum.total} />}
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="낸 돈" value={won(sum.paid)} />
          <Stat label="낼 돈" value={won(sum.planned)} />
          <Stat label={sum.left < 0 ? "넘은 돈" : "남은 돈"} value={sum.total ? won(Math.abs(sum.left)) : "-"} warn={sum.left < 0} />
        </dl>
      </section>

      {sum.total === 0 && (
        <Link href="/budget/edit" className="card block text-[14px] text-sub">
          총예산을 정하고 카테고리별로 나누면 얼마나 썼는지, 얼마나 남았는지 한눈에 볼 수 있어요 <b className="font-semibold text-save">예산 나누기 ›</b>
        </Link>
      )}

      <section>
        <h2 className="section-title">
          카테고리별
          <small>진한 색 = 낸 돈 · 연한 색 = 낼 돈</small>
        </h2>
        {rows.length > 0 ? (
          <ul className="card ledger !py-1">
            {rows.map((r) => {
              const [paidW, plannedW] = stackPct(r.paid, r.planned, r.budget || maxUsed);
              return (
                <li key={r.name} className="space-y-2 py-3.5">
                  <div className="flex items-baseline gap-2">
                    <CategoryDot color={r.color} />
                    <span className="flex-1 text-[15px] font-semibold">{r.name}</span>
                    <span className="num text-[13px] text-sub">
                      <b className="font-semibold text-ink">{won(r.paid + r.planned)}</b>
                      {r.budget > 0 && ` / ${won(r.budget)}`}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full" style={{ background: soft(r.color, 0.18) }}>
                    <span className="h-full" style={{ width: `${paidW}%`, background: r.color }} />
                    <span className="h-full" style={{ width: `${plannedW}%`, background: soft(r.color, 0.5) }} />
                  </div>
                  {r.over > 0 && <p className="text-[12px] font-semibold text-spend">예산보다 {won(r.over)} 넘어요</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-[14px] text-sub">이벤트에 금액을 넣은 결제가 생기면 여기에 쌓여요</p>
        )}
      </section>

      <section>
        <h2 className="section-title">
          낼 돈
          <small>날짜순</small>
        </h2>
        {upcoming.length > 0 ? (
          <ul className="card ledger !py-1">
            {upcoming.map((d) => {
              const days = daysUntil(d.date, now);
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <Link href={`/events/${d.event.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                    <CategoryDot color={colorOf(cats, d.event.category)} className="h-2.5 w-2.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{d.title}</span>
                      <span className={`num block truncate text-[12px] ${days < 0 ? "font-semibold text-spend" : "text-sub"}`}>
                        {d.event.title} · {shortDate(d.date)} · {dueLabel(days)}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[14px] font-semibold">{won(d.amount!)}</span>
                  </Link>
                  <form action={toggleDue.bind(null, d.id)}>
                    <SubmitButton base="btn-ghost" pendingText="…" className="!bg-save-soft !px-2.5 !py-1.5 text-[12px] !text-save">
                      냈어요
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-[14px] text-sub">낼 돈이 없어요. 이벤트 화면의 '+ 결제'로 계약금·잔금을 적어 두세요</p>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="section-title">최근 낸 돈</h2>
          <ul className="card ledger !py-1">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/events/${d.event.id}`} className="flex items-center gap-3 py-3">
                  <CategoryDot color={colorOf(cats, d.event.category)} className="h-2.5 w-2.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{d.title}</span>
                    <span className="block truncate text-[12px] text-sub">
                      {d.event.title}
                      {d.doneBy && ` · ${d.doneBy}`}
                      {d.doneAt && ` · ${shortDate(d.doneAt)}`}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[14px] text-sub">{won(d.amount!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-card/70 px-2 py-2.5">
      <dt className="text-[11px] text-sub">{label}</dt>
      <dd className={`num mt-0.5 truncate text-[14px] font-bold ${warn ? "text-spend" : ""}`}>{value}</dd>
    </div>
  );
}

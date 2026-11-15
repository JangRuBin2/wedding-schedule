import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { budgetSummary, stackPct } from "@/lib/budget";
import { daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { colorOf, soft } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "@/components/CategoryDot";
import { UsageBar } from "@/components/UsageBar";
import { Tip } from "@/components/Tip";
import { SubmitButton } from "@/components/SubmitButton";
import { toggleDue } from "../actions";

export const dynamic = "force-dynamic";

/** 예산 (보기). 카테고리별 예산은 작성 화면에서, 돈은 이벤트의 '결제'와 '지출 기록'에서 쌓임 */
export default async function BudgetPage() {
  const now = new Date();
  const [cats, dues, expenses] = await Promise.all([
    getCategories(),
    prisma.due.findMany({
      where: { amount: { not: null } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { event: { select: { id: true, title: true, category: true } } },
    }),
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { event: { select: { title: true } }, _count: { select: { receipts: true } } },
    }),
  ]);
  // 지출 기록은 이미 쓴 돈이라 '결제 완료'와 같이 '지출'로
  const pays = [
    ...dues.map((d) => ({ amount: d.amount, done: d.done, category: d.event.category })),
    ...expenses.map((x) => ({ amount: x.amount, done: true, category: x.category })),
  ];
  const sum = budgetSummary(cats, pays);
  const upcoming = dues.filter((d) => !d.done).slice(0, 8);
  // 최근 지출: 결제 완료한 결제 + 지출 기록을 한 목록으로 (결제는 낸 날, 지출은 결제일 기준)
  const recent = [
    ...dues
      .filter((d) => d.done)
      .map((d) => ({
        key: `d-${d.id}`,
        href: `/events/${d.event.id}`,
        at: d.doneAt ?? d.date,
        title: d.title,
        sub: [d.event.title, d.doneBy, d.doneAt && shortDate(d.doneAt)].filter(Boolean).join(" · "),
        amount: d.amount!,
        color: colorOf(cats, d.event.category),
      })),
    ...expenses.map((x) => ({
      key: `x-${x.id}`,
      href: `/expenses/${x.id}`,
      at: x.date,
      title: x.title,
      sub: [shortDate(x.date), x.event?.title ?? x.category, x._count.receipts > 0 && `증빙 ${x._count.receipts}`].filter(Boolean).join(" · "),
      amount: x.amount,
      color: colorOf(cats, x.category),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);
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
            + 지출 기록
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
          <Tip align="right">막대의 진한 색은 지출(결제 완료 + 지출 기록), 연한 색은 결제 예정이에요</Tip>
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
                  {r.over > 0 && <p className="text-[12px] font-semibold text-spend">예산 {won(r.over)} 초과</p>}
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
                      결제 완료
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-[14px] text-sub">예정된 결제가 없어요</p>
        )}
      </section>

      <section>
        <h2 className="section-title">
          최근 지출
          <Link href="/expenses" className="text-[12px] font-semibold text-save">
            지출 내역 {expenses.length > 0 && <span className="num">{expenses.length}건</span>} ›
          </Link>
        </h2>
        {recent.length > 0 ? (
          <ul className="card ledger !py-1">
            {recent.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="flex items-center gap-3 py-3">
                  <CategoryDot color={r.color} className="h-2.5 w-2.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{r.title}</span>
                    <span className="num block truncate text-[12px] text-sub">{r.sub}</span>
                  </span>
                  <span className="num shrink-0 text-[14px] text-sub">{won(r.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/expenses/new" className="card block text-[14px] text-sub">
            쓴 돈을 기록하고 영수증을 붙여 두세요 <b className="font-semibold text-save">지출 기록하기 ›</b>
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

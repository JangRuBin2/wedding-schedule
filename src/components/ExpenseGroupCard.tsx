import Link from "next/link";
import { daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { PART_LABELS } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "./CategoryDot";

export type GroupPay = { id: string; label: string; amount: number | null; date: Date; paid: boolean; _count: { receipts: number } };
export type GroupView = { key: string; title: string; category: string; event: { title: string } | null; expenses: GroupPay[] };

const order = (l: string) => (PART_LABELS as readonly string[]).indexOf(l);

/**
 * 결제·지출 항목 카드 (결제 내역 화면). 항목 이름·합계 아래 결제(계약금·잔금…)가 한 줄씩.
 * 줄을 누르면 그 결제 상세(항목 전체가 보이고 그 결제가 강조됨)
 */
export function ExpenseGroupCard({ g, color, now = new Date() }: { g: GroupView; color: string; now?: Date }) {
  const pays = [...g.expenses].sort((a, b) => order(a.label) - order(b.label) || a.date.getTime() - b.date.getTime());
  const total = pays.reduce((n, p) => n + (p.amount ?? 0), 0);
  const left = pays.filter((p) => !p.paid);
  return (
    <article className="card !px-4 !py-3">
      <Link href={`/expenses/${pays[0].id}`} className="flex items-center gap-2.5 pb-1.5">
        <CategoryDot color={color} className="h-2.5 w-2.5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{g.title}</span>
          <span className="block truncate text-[12px] text-sub">
            {g.event?.title ?? g.category}
            {left.length > 0 && pays.length > 1 && ` · ${pays.length - left.length}/${pays.length} 냄`}
          </span>
        </span>
        <span className="num shrink-0 text-[15px] font-bold">{won(total)}</span>
      </Link>
      <ul className="space-y-0.5 border-t border-line pt-1.5">
        {pays.map((p) => {
          const days = daysUntil(p.date, now);
          return (
            <li key={p.id}>
              <Link href={`/expenses/${p.id}`} className="flex items-center gap-2 py-1 text-[13px]">
                <span className={`w-12 shrink-0 font-semibold ${p.paid ? "text-sub" : ""}`}>{p.label}</span>
                <span className={`rounded px-1 text-[11px] font-bold ${p.paid ? "bg-paper text-sub" : "bg-save-soft text-save"}`}>{p.paid ? "완료" : "예정"}</span>
                <span className={`num min-w-0 flex-1 truncate text-[12px] ${!p.paid && days < 0 ? "font-semibold text-spend" : "text-sub"}`}>
                  {shortDate(p.date)}
                  {!p.paid && ` · ${dueLabel(days)}`}
                  {p._count.receipts > 0 && ` · 첨부 ${p._count.receipts}`}
                </span>
                <span className={`num shrink-0 ${p.amount == null ? "text-faint" : p.paid ? "text-sub" : "font-semibold"}`}>
                  {p.amount == null ? "금액 미정" : won(p.amount)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

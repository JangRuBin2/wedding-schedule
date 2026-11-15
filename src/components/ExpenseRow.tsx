import Link from "next/link";
import { shortDate } from "@/lib/dates";
import { won } from "@/lib/money";
import { CategoryDot } from "./CategoryDot";

type Row = { id: string; title: string; amount: number; date: Date; category: string; event: { title: string } | null; _count: { receipts: number } };

/** 지출 한 줄 (지출 내역·예산 탭 공통) */
export function ExpenseRow({ x, color }: { x: Row; color: string }) {
  return (
    <Link href={`/expenses/${x.id}`} className="flex items-center gap-3 py-3">
      <CategoryDot color={color} className="h-2.5 w-2.5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{x.title}</span>
        <span className="num block truncate text-[12px] text-sub">
          {shortDate(x.date)} · {x.event?.title ?? x.category}
          {x._count.receipts > 0 && ` · 증빙 ${x._count.receipts}`}
        </span>
      </span>
      <span className="num shrink-0 text-[14px] font-semibold">{won(x.amount)}</span>
    </Link>
  );
}

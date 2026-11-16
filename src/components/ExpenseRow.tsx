import Link from "next/link";
import { setPaid } from "@/app/actions";
import { daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { won } from "@/lib/money";
import { CategoryDot } from "./CategoryDot";
import { SubmitButton } from "./SubmitButton";

type Row = {
  id: string;
  title: string;
  amount: number | null;
  date: Date;
  paid: boolean;
  category: string;
  event: { title: string } | null;
  _count: { receipts: number };
};

/**
 * 결제·지출 한 줄 (예산·결제 내역·이벤트 화면 공통). 낼 예정이면 남은 날과 '결제 완료' 버튼.
 * showEvent=false 면 이벤트 이름 대신 카테고리 (이벤트 화면 안에서)
 */
export function ExpenseRow({ x, color, now = new Date(), showEvent = true }: { x: Row; color: string; now?: Date; showEvent?: boolean }) {
  const days = daysUntil(x.date, now);
  const where = (showEvent && x.event?.title) || x.category;
  return (
    <div className="flex items-center gap-3">
      <Link href={`/expenses/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
        <CategoryDot color={color} className="h-2.5 w-2.5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{x.title}</span>
          <span className="num block truncate text-[12px] text-sub">
            {x.paid ? (
              shortDate(x.date)
            ) : (
              <span className={days < 0 ? "font-semibold text-spend" : ""}>
                {shortDate(x.date)} · {dueLabel(days)}
              </span>
            )}
            {` · ${where}`}
            {x._count.receipts > 0 && ` · 증빙 ${x._count.receipts}`}
          </span>
        </span>
        <span className={`num shrink-0 text-[14px] font-semibold ${x.amount == null ? "!font-normal text-faint" : x.paid ? "" : "text-sub"}`}>
          {x.amount == null ? "금액 미정" : won(x.amount)}
        </span>
      </Link>
      {!x.paid &&
        (x.amount == null ? (
          // 금액을 모르는 채로 '냈어요'가 되지 않게 수정 화면에서 금액을 받음
          <Link href={`/expenses/${x.id}/edit?pay=1`} className="btn-ghost !bg-save-soft !px-2.5 !py-1.5 text-[12px] !text-save">
            결제 완료
          </Link>
        ) : (
          <form action={setPaid.bind(null, x.id, true)}>
            <SubmitButton base="btn-ghost" pendingText="…" className="!bg-save-soft !px-2.5 !py-1.5 text-[12px] !text-save">
              결제 완료
            </SubmitButton>
          </form>
        ))}
    </div>
  );
}

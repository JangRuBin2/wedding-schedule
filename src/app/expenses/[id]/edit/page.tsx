import { notFound } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { PART_LABELS, splitTitle, type ExpensePart } from "@/lib/meta";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EventLinkSelect } from "@/components/EventLinkSelect";
import { ExpenseForm } from "@/components/ExpenseForm";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteExpenseGroup } from "../../../actions";

export const dynamic = "force-dynamic";

const RECEIPTS = { where: { ready: true }, orderBy: { createdAt: "asc" as const }, select: { id: true, width: true, height: true, mime: true, name: true, size: true } };
const order = (l: string) => (PART_LABELS as readonly string[]).indexOf(l);

/** 결제·지출 항목 수정 (작성 화면). 연 결제가 속한 항목의 결제 전부를 칸으로 (계약금 → 잔금 순) */
export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pay?: string | string[] }>;
}) {
  const db = await scoped();
  const { id } = await params;
  // '결제 완료'를 눌렀는데 금액이 없어서 온 경우: 그 결제를 결제 완료로 골라 둔 채로 열어서 금액만 넣으면 되게
  const pay = (await searchParams).pay === "1";
  const [x, cats, events] = await Promise.all([
    db.expense.findUnique({
      where: { id },
      include: {
        group: { include: { expenses: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], include: { receipts: RECEIPTS } } } },
        receipts: RECEIPTS,
      },
    }),
    getCategories(),
    db.event.findMany({ orderBy: [{ order: "asc" }], select: { id: true, title: true, category: true, date: true, done: true } }),
  ]);
  if (!x) notFound();
  // 옛 기록(아직 항목에 안 묶임)은 결제 하나짜리 항목처럼
  const group = x.group ?? { id: "", title: splitTitle(x.title).base, category: x.category, eventId: x.eventId, expenses: [x] };
  const parts: ExpensePart[] = [...group.expenses]
    .sort((a, b) => order(a.label) - order(b.label))
    .map((e, i) => ({
      key: i + 1,
      id: e.id,
      label: e.label,
      paid: e.paid || (pay && e.id === x.id),
      amount: e.amount ? e.amount.toLocaleString("en-US") : "",
      date: ymd(e.date),
      memo: e.memo ?? "",
      receipts: e.receipts,
    }));
  // 계약금은 있는데 잔금이 없으면 빈 잔금 칸 (적으면 새로 생김)
  if (parts.some((p) => p.label === "계약금") && !parts.some((p) => p.label === "잔금"))
    parts.push({ key: 99, label: "잔금", paid: false, amount: "", date: "", memo: "", receipts: [] });
  const receiptCount = group.expenses.reduce((n: number, e: { receipts: unknown[] }) => n + e.receipts.length, 0);

  return (
    <main className="space-y-6">
      <WriteHeader back={`/expenses/${x.id}`} backLabel="취소" title="결제·지출 수정" />
      <ExpenseForm
        initial={{ groupId: group.id || undefined, title: group.title, date: ymd(x.date), parts, focus: x.id }}
        categoryField={<CategoryPicker categories={cats} value={group.category} />}
        eventField={<EventLinkSelect events={events} value={group.eventId ?? ""} />}
      />
      {group.id && (
        <form action={deleteExpenseGroup.bind(null, group.id)} className="text-center">
          <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…" confirm={`'${group.title}' 항목의 결제 ${group.expenses.length}건을 모두 지울까요?`}>
            &apos;{group.title}&apos; 항목 통째로 삭제 (결제 {group.expenses.length}건{receiptCount > 0 && `, 첨부 ${receiptCount}개`})
          </SubmitButton>
        </form>
      )}
    </main>
  );
}

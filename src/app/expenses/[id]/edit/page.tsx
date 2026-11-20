import { notFound } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { joinTitle, PART_LABELS, splitTitle, type ExpensePart } from "@/lib/meta";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EventLinkSelect } from "@/components/EventLinkSelect";
import { ExpenseForm } from "@/components/ExpenseForm";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteExpense } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pay?: string | string[] }>;
}) {
  const db = await scoped();
  const { id } = await params;
  // '결제 완료'를 눌렀는데 금액이 없어서 온 경우: 결제 완료를 골라 둔 채로 열어서 금액만 넣으면 되게
  const pay = (await searchParams).pay === "1";
  const [x, cats, events] = await Promise.all([
    db.expense.findUnique({
      where: { id },
      include: {
        receipts: { where: { ready: true }, orderBy: { createdAt: "asc" }, select: { id: true, width: true, height: true, mime: true, name: true, size: true } },
      },
    }),
    getCategories(),
    db.event.findMany({ orderBy: [{ order: "asc" }], select: { id: true, title: true, category: true, date: true, done: true } }),
  ]);
  if (!x) notFound();
  // 같은 항목의 다른 결제(헤어 메이크업 계약금 ↔ 잔금)를 같이 보여 줌. 연 건이 맨 앞
  const { base, label } = splitTitle(x.title);
  const siblings = await db.expense.findMany({
    where: { id: { not: x.id }, title: { in: PART_LABELS.map((l) => joinTitle(base, l)) } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, amount: true, date: true, paid: true },
  });
  const toPart = (e: { id: string; title: string; amount: number | null; date: Date; paid: boolean }, key: number): ExpensePart => ({
    key,
    id: e.id,
    label: splitTitle(e.title).label,
    paid: e.paid,
    amount: e.amount ? e.amount.toLocaleString("en-US") : "",
    date: ymd(e.date),
  });
  const parts = [{ ...toPart(x, 1), paid: x.paid || pay }, ...siblings.slice(0, 6).map((e, i) => toPart(e, i + 2))];
  // 한 번에 낸 '전액'이 아니고 계약금이나 잔금이 없으면 빈 칸으로 채워 둠 (적으면 새로 생김)
  const has = (l: string) => parts.some((p) => p.label === l);
  if (label !== "전액") {
    if (!has("잔금")) parts.push({ key: 90, label: "잔금", paid: false, amount: "", date: "" });
    else if (!has("계약금")) parts.push({ key: 91, label: "계약금", paid: true, amount: "", date: "" });
  }
  return (
    <main className="space-y-6">
      <WriteHeader back={`/expenses/${x.id}`} backLabel="취소" title={x.paid ? "지출 수정" : "결제 예정 수정"} />
      <ExpenseForm
        initial={{ id: x.id, title: base, date: ymd(x.date), memo: x.memo ?? "", paid: x.paid || pay, parts }}
        receipts={x.receipts}
        categoryField={<CategoryPicker categories={cats} value={x.category} />}
        eventField={<EventLinkSelect events={events} value={x.eventId ?? ""} />}
      />
      <form action={deleteExpense.bind(null, x.id, "/expenses")} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…">
          이 기록 삭제{x.receipts.length > 0 && ` (첨부 ${x.receipts.length}개 포함)`}
        </SubmitButton>
      </form>
    </main>
  );
}

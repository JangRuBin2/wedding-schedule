import { notFound } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
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
  return (
    <main className="space-y-6">
      <WriteHeader back={`/expenses/${x.id}`} backLabel="취소" title={x.paid ? "지출 수정" : "결제 예정 수정"} />
      <ExpenseForm
        initial={{ id: x.id, title: x.title, amount: x.amount, date: ymd(x.date), memo: x.memo ?? "", paid: x.paid || pay }}
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

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EventLinkSelect } from "@/components/EventLinkSelect";
import { ExpenseForm } from "@/components/ExpenseForm";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteExpense } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [x, cats, events] = await Promise.all([
    prisma.expense.findUnique({
      where: { id },
      include: { receipts: { orderBy: { createdAt: "asc" }, select: { id: true, width: true, height: true } } },
    }),
    getCategories(),
    prisma.event.findMany({ orderBy: [{ order: "asc" }], select: { id: true, title: true, category: true, date: true, done: true } }),
  ]);
  if (!x) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/expenses/${x.id}`} backLabel="취소" title="지출 수정" />
      <ExpenseForm
        initial={{ id: x.id, title: x.title, amount: x.amount, date: ymd(x.date), memo: x.memo ?? "" }}
        receipts={x.receipts}
        categoryField={<CategoryPicker categories={cats} value={x.category} />}
        eventField={<EventLinkSelect events={events} value={x.eventId ?? ""} />}
      />
      <form action={deleteExpense.bind(null, x.id, "/expenses")} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…">
          이 지출 삭제{x.receipts.length > 0 && ` (증빙 ${x.receipts.length}장 포함)`}
        </SubmitButton>
      </form>
    </main>
  );
}

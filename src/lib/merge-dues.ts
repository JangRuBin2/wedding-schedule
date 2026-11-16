/**
 * 옛 결제(Due) → 결제·지출(Expense) 로 옮길 계획. 같은 돈을 결제와 지출 기록으로 두 번 적은 경우
 * (같은 이벤트 · 같은 금액 · 같은 항목 이름)는 지출 기록 하나만 남기고 결제는 버림 — 예산이 두 번 잡히던 문제.
 * DB 에 안 닿는 순수 함수라 테스트로 확인 (scripts/merge-dues.ts 가 실제로 옮김)
 */
export type OldDue = {
  id: string;
  eventId: string;
  eventCategory: string;
  title: string;
  date: Date;
  amount: number | null;
  memo: string | null;
  done: boolean;
  doneAt: Date | null;
  doneBy: string | null;
  createdAt: Date;
};
export type ExistingExpense = { id: string; eventId: string | null; title: string; amount: number | null };

export type NewExpense = {
  title: string;
  amount: number | null;
  date: Date;
  category: string;
  eventId: string;
  memo: string | null;
  paid: boolean;
  paidAt: Date | null;
  paidBy: string | null;
  createdAt: Date;
};

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export function planDueMerge(dues: OldDue[], expenses: ExistingExpense[]) {
  const taken = new Set<string>();
  const create: { dueId: string; data: NewExpense }[] = [];
  const duplicate: { dueId: string; expenseId: string }[] = [];
  for (const d of dues) {
    const twin =
      d.amount != null
        ? expenses.find((x) => !taken.has(x.id) && x.eventId === d.eventId && x.amount === d.amount && norm(x.title) === norm(d.title))
        : undefined;
    if (twin) {
      taken.add(twin.id);
      duplicate.push({ dueId: d.id, expenseId: twin.id });
      continue;
    }
    create.push({
      dueId: d.id,
      data: {
        title: d.title,
        amount: d.amount && d.amount > 0 ? d.amount : null,
        date: d.date,
        category: d.eventCategory,
        eventId: d.eventId,
        memo: d.memo,
        paid: d.done,
        paidAt: d.done ? d.doneAt : null,
        paidBy: d.done ? d.doneBy : null,
        createdAt: d.createdAt,
      },
    });
  }
  return { create, duplicate };
}

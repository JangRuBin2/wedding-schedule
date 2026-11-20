import { joinTitle, splitTitle } from "./meta";

type Loose = { id: string; coupleId: string | null; title: string; category: string; eventId: string | null; createdBy: string | null; createdAt: Date };
export type GroupPlan = {
  coupleId: string | null;
  title: string;
  category: string;
  eventId: string | null;
  createdBy: string | null;
  createdAt: Date;
  expenses: { id: string; label: string; title: string }[];
};

/**
 * 안 묶인 결제를 '커플 + 항목 이름'으로 묶는 계획 (scripts/group-expenses.ts). 순서는 받은 순서(날짜순) 그대로.
 * 항목의 카테고리·이벤트·만든 사람은 첫 결제 것, 이벤트는 비어 있으면 뒤 결제에서 채움
 */
export function planExpenseGroups(list: Loose[]): GroupPlan[] {
  const map = new Map<string, GroupPlan>();
  for (const e of list) {
    const { base, label } = splitTitle(e.title);
    const key = `${e.coupleId ?? ""}\u0000${base}`;
    let g = map.get(key);
    if (!g) {
      g = { coupleId: e.coupleId, title: base, category: e.category, eventId: e.eventId, createdBy: e.createdBy, createdAt: e.createdAt, expenses: [] };
      map.set(key, g);
    }
    g.eventId ??= e.eventId;
    if (e.createdAt < g.createdAt) g.createdAt = e.createdAt;
    g.expenses.push({ id: e.id, label, title: joinTitle(base, label) });
  }
  return [...map.values()];
}

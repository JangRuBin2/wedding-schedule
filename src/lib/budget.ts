/** 예산 탭 계산. 결제(Due)의 금액을 그 이벤트 카테고리 예산에 쌓음: 냈어요 = 낸 돈, 아직 = 낼 돈 */
type Cat = { name: string; color: string; budget: number };
type Pay = { amount: number | null; done: boolean; category: string };

export function budgetSummary(cats: Cat[], pays: Pay[]) {
  const rows = cats.map((c) => {
    const mine = pays.filter((p) => p.category === c.name && p.amount);
    const paid = mine.filter((p) => p.done).reduce((n, p) => n + p.amount!, 0);
    const planned = mine.filter((p) => !p.done).reduce((n, p) => n + p.amount!, 0);
    return { ...c, paid, planned, over: c.budget > 0 ? Math.max(0, paid + planned - c.budget) : 0 };
  });
  // 지워진 카테고리 이름이 남은 결제가 있으면 따로 (보통은 '기타'로 옮겨져서 없음)
  const known = new Set(cats.map((c) => c.name));
  const orphan = pays.filter((p) => !known.has(p.category) && p.amount);
  const total = rows.reduce((n, r) => n + r.budget, 0);
  const paid = rows.reduce((n, r) => n + r.paid, 0) + orphan.filter((p) => p.done).reduce((n, p) => n + p.amount!, 0);
  const planned = rows.reduce((n, r) => n + r.planned, 0) + orphan.filter((p) => !p.done).reduce((n, p) => n + p.amount!, 0);
  return { rows, total, paid, planned, left: total - paid - planned };
}

/** 막대 폭(%). 예산이 없으면 가장 많이 쓴 카테고리 기준 */
export const barPct = (n: number, base: number) => (base > 0 ? Math.min(100, (n / base) * 100) : 0);

/** 낸 돈 + 낼 돈을 이어 붙인 막대 두 칸 폭(%). 합이 100을 넘지 않게 낼 돈 쪽을 자름 */
export function stackPct(paid: number, planned: number, base: number) {
  const a = barPct(paid, base);
  return [a, Math.min(100 - a, barPct(planned, base))] as const;
}

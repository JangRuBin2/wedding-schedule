import { getCategories } from "@/lib/categories";
import { BudgetPlanner } from "@/components/BudgetPlanner";
import { WriteHeader } from "@/components/WriteHeader";

export const dynamic = "force-dynamic";

/** 예산 나누기 (작성 화면). 총예산을 정하고 카테고리별로 슬라이더로 배분 */
export default async function EditBudgetPage() {
  const cats = await getCategories();
  return (
    <main className="space-y-6">
      <WriteHeader
        back="/budget"
        backLabel="취소"
        title="예산 설정"
        sub="총예산을 입력하고 카테고리별 비율을 조절하세요. 고정한 항목은 다른 항목을 움직여도 바뀌지 않아요"
      />
      <div className="card">
        <BudgetPlanner categories={cats.map((c) => ({ id: c.id, name: c.name, color: c.color, budget: c.budget }))} />
      </div>
    </main>
  );
}

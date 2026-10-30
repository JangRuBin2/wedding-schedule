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
        title="예산 나누기"
        sub="총예산(100만 원부터)을 적고 슬라이더로 나눠요. 잠그면 다른 슬라이더를 움직여도 그대로예요"
      />
      <div className="card">
        <BudgetPlanner categories={cats.map((c) => ({ id: c.id, name: c.name, color: c.color, budget: c.budget }))} />
      </div>
      <p className="px-1 text-[12px] leading-relaxed text-sub">
        카테고리는 마이 → 카테고리에서 추가할 수 있어요. 쓴 돈은 각 이벤트의 &lsquo;결제&rsquo;에 금액을 넣으면 예산 탭에 쌓여요.
      </p>
    </main>
  );
}

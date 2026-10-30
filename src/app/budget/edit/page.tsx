import { getCategories } from "@/lib/categories";
import { CategoryDot } from "@/components/CategoryDot";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { saveBudgets } from "../../actions";

export const dynamic = "force-dynamic";

/** 카테고리별 예산 정하기 (작성). 비우면 0 = 안 정함 */
export default async function EditBudgetPage() {
  const cats = await getCategories();
  return (
    <main className="space-y-6">
      <WriteHeader back="/budget" backLabel="취소" title="예산 정하기" sub="카테고리마다 쓸 돈을 적어요. 300000처럼 써도 되고 30만처럼 써도 돼요. 비워 두면 안 정한 걸로 봐요" />
      <form action={saveBudgets} className="card space-y-4">
        {cats.map((c, i) => (
          <label key={c.id} className="flex items-center gap-3">
            <CategoryDot color={c.color} className="h-2.5 w-2.5" />
            <span className="w-24 shrink-0 truncate text-[15px] font-semibold">{c.name}</span>
            <input
              name={`budget:${c.id}`}
              defaultValue={c.budget ? String(c.budget) : ""}
              placeholder="0"
              inputMode="numeric"
              maxLength={20}
              autoFocus={i === 0}
              className="input num text-right"
            />
            <span className="text-[13px] text-sub">원</span>
          </label>
        ))}
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      <p className="px-1 text-[12px] leading-relaxed text-sub">
        카테고리는 마이 → 카테고리에서 추가할 수 있어요. 쓴 돈은 각 이벤트의 &lsquo;결제&rsquo;에 금액을 넣으면 여기로 쌓여요.
      </p>
    </main>
  );
}

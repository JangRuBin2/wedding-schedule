import { CategoryFields } from "@/components/CategoryFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { safeBack } from "@/lib/back";
import { addCategory } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ back?: string | string[] }> }) {
  const back = safeBack((await searchParams).back, "/settings/categories");
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="카테고리 추가" />
      <form action={addCategory} className="card space-y-5">
        <input type="hidden" name="back" value={back} />
        <CategoryFields />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}

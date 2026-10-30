import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FALLBACK_CATEGORY } from "@/lib/meta";
import { CategoryFields } from "@/components/CategoryFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteCategory, updateCategory } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.category.findUnique({ where: { id } });
  if (!c) notFound();
  const isFallback = c.name === FALLBACK_CATEGORY;
  const used = await prisma.event.count({ where: { category: c.name } });
  return (
    <main className="space-y-6">
      <WriteHeader back="/settings/categories" backLabel="취소" title="카테고리 수정" sub={used ? `이벤트 ${used}개가 이 카테고리에 속해 있어요. 이름을 바꾸면 함께 바뀌어요` : undefined} />
      <form action={updateCategory} className="card space-y-5">
        <input type="hidden" name="id" value={c.id} />
        <CategoryFields name={c.name} color={c.color} lockName={isFallback} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      {!isFallback && (
        <form action={deleteCategory.bind(null, c.id)} className="text-center">
          <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…">이 카테고리 삭제</SubmitButton>
          {used > 0 && <p className="mt-1.5 text-[12px] text-sub">이벤트 {used}개는 '{FALLBACK_CATEGORY}'로 이동해요</p>}
        </form>
      )}
    </main>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { FALLBACK_CATEGORY } from "@/lib/meta";
import { CategoryDot } from "@/components/CategoryDot";
import { LinkPending } from "@/components/LinkPending";
import { Tip } from "@/components/Tip";

export const dynamic = "force-dynamic";

/** 카테고리 목록 (보기). 추가·수정은 작성 화면으로 */
export default async function CategoriesPage() {
  const [cats, counts] = await Promise.all([getCategories(), prisma.event.groupBy({ by: ["category"], _count: true })]);
  const count = (name: string) => counts.find((c) => c.category === name)?._count ?? 0;
  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <Link href="/settings" className="text-[13px] font-semibold text-sub">‹ 설정</Link>
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 text-[22px] font-bold">카테고리<Tip>이벤트를 분류하는 데 사용해요. 예산도 카테고리별로 설정해요</Tip></h1>
          <Link href="/settings/categories/new" className="btn relative !px-4 !py-2">
            + 카테고리
            <LinkPending />
          </Link>
        </div>
      </header>
      <ul className="card ledger !py-1">
        {cats.map((c) => (
          <li key={c.id}>
            <Link href={`/settings/categories/${c.id}/edit`} className="flex items-center gap-3 py-3">
              <CategoryDot color={c.color} className="h-3 w-3" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{c.name}</span>
              <span className="text-[13px] text-sub">
                이벤트 {count(c.name)}개{c.name === FALLBACK_CATEGORY && " · 기본"}
              </span>
              <span className="text-faint" aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

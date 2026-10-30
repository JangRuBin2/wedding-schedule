import Link from "next/link";
import type { CategoryInfo } from "@/lib/meta";

/** 카테고리 고르기 칩 (작성 화면). 라디오라서 키보드로도 고를 수 있음 */
export function CategoryPicker({ categories, value }: { categories: CategoryInfo[]; value?: string }) {
  const current = categories.some((c) => c.name === value) ? value : categories.at(-1)?.name;
  return (
    <fieldset className="space-y-1.5">
      <legend className="label mb-1.5">카테고리</legend>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <label key={c.name} className="chip">
            <input type="radio" name="category" value={c.name} defaultChecked={c.name === current} />
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
            {c.name}
          </label>
        ))}
        <Link href="/settings/categories" className="chip !bg-transparent !text-save">
          카테고리 관리
        </Link>
      </div>
    </fieldset>
  );
}

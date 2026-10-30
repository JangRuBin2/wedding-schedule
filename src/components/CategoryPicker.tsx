import { CATEGORIES } from "@/lib/meta";

/** 카테고리 고르기 칩 (작성 화면). 라디오라서 키보드로도 고를 수 있음 */
export function CategoryPicker({ value }: { value?: string }) {
  const current = value ?? "기타";
  return (
    <fieldset className="space-y-1.5">
      <legend className="label mb-1.5">카테고리</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <label key={c.name} className="chip" title={c.hint}>
            <input type="radio" name="category" value={c.name} defaultChecked={c.name === current} />
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
            {c.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import { COLOR_PALETTE } from "@/lib/meta";
import { Tip } from "./Tip";

/** 카테고리 추가·수정 공통 입력 칸: 이름, 색 */
export function CategoryFields({ name = "", color = COLOR_PALETTE[0], lockName = false }: { name?: string; color?: string; lockName?: boolean }) {
  return (
    <>
      <label className="block space-y-1">
        <span className="label flex items-center gap-1">이름{lockName && <Tip>&apos;기타&apos;는 이름을 바꿀 수 없어요</Tip>}</span>
        <input
          name="name"
          defaultValue={name}
          placeholder="예: 혼수"
          required
          autoFocus={!name}
          maxLength={20}
          readOnly={lockName}
          className={`input ${lockName ? "text-sub" : ""}`}
        />
        
      </label>
      <fieldset className="space-y-1.5">
        <legend className="label mb-2">색</legend>
        <div className="flex flex-wrap gap-3">
          {COLOR_PALETTE.map((c) => (
            <label key={c} className="swatch" style={{ "--c": c } as React.CSSProperties} title={c}>
              <input type="radio" name="color" value={c} defaultChecked={c === color} aria-label={c} />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

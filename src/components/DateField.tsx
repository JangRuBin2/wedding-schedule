/** 날짜 + '날짜 미정'. 미정을 고르면 날짜 칸은 무시함 */
export function DateField({ defaultValue, undated }: { defaultValue: string; undated: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor="date" className="label">날짜</label>
      <div className="flex items-center gap-3">
        <input id="date" name="date" type="date" defaultValue={defaultValue} className="input" />
        <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-sub">
          <input type="checkbox" name="undated" defaultChecked={undated} className="h-4 w-4 accent-[var(--color-save)]" />
          날짜 미정
        </label>
      </div>
    </div>
  );
}

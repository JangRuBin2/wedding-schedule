import { DUE_SUGGESTIONS } from "@/lib/meta";

/** 돈 낼 날 추가·수정 공통 입력 칸: 무엇, 날짜, 메모 */
export function DueFields({ title = "", date = "", memo = "" }: { title?: string; date?: string; memo?: string }) {
  return (
    <>
      <label className="block space-y-1">
        <span className="label">무엇</span>
        <input name="title" defaultValue={title} placeholder="예: 잔금" required autoFocus={!title} maxLength={60} list="due-suggestions" className="input" />
        <datalist id="due-suggestions">
          {DUE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1">
        <span className="label">날짜</span>
        <input name="date" type="date" defaultValue={date} required className="input" />
      </label>
      <label className="block space-y-1">
        <span className="label">메모 (선택)</span>
        <input name="memo" defaultValue={memo} placeholder="예: 계좌이체, 영수증 받기" maxLength={500} className="input" />
        <span className="block text-[12px] text-sub">금액은 따로 계산하지 않아요. 적어 두고 싶으면 메모에 써 주세요</span>
      </label>
    </>
  );
}

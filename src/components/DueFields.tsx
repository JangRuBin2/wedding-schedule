import { DUE_SUGGESTIONS } from "@/lib/meta";

/** 결제 추가·수정 공통 칸: 무엇, 금액, 날짜, 메모 (+ 추가할 때만 '이미 냈어요') */
export function DueFields({
  title = "",
  amount = "",
  date = "",
  memo = "",
  isNew = false,
}: {
  title?: string;
  amount?: string;
  date?: string;
  memo?: string;
  isNew?: boolean;
}) {
  return (
    <>
      <label className="block space-y-1.5">
        <span className="label">무엇</span>
        <input name="title" defaultValue={title} placeholder="예: 잔금" required autoFocus={!title} maxLength={60} list="due-suggestions" className="input" />
        <datalist id="due-suggestions">
          {DUE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1.5">
        <span className="label">금액 (선택)</span>
        <input name="amount" defaultValue={amount} placeholder="예: 300000 또는 30만" inputMode="numeric" maxLength={20} className="input num" />
        <span className="block text-[12px] text-sub">금액을 넣으면 예산 탭에 쌓여요</span>
      </label>
      <label className="block space-y-1.5">
        <span className="label">날짜</span>
        <input name="date" type="date" defaultValue={date} required className="input" />
        <span className="block text-[12px] text-sub">낼 날(예정) 또는 낸 날</span>
      </label>
      <label className="block space-y-1.5">
        <span className="label">메모 (선택)</span>
        <input name="memo" defaultValue={memo} placeholder="예: 계좌이체, 영수증 받기" maxLength={500} className="input" />
      </label>
      {isNew && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="paid" className="h-4 w-4 accent-[var(--color-save)]" />
          이미 냈어요
        </label>
      )}
    </>
  );
}

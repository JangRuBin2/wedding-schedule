import { DUE_SUGGESTIONS } from "@/lib/meta";
import { Tip } from "./Tip";

/** 결제 추가·수정 공통 칸: 무엇, 금액(만 원 단위), 날짜, 메모 (+ 추가할 때만 '이미 냈어요') */
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
        <span className="label">항목</span>
        <input name="title" defaultValue={title} placeholder="예: 잔금" required autoFocus={!title} maxLength={60} list="due-suggestions" className="input" />
        <datalist id="due-suggestions">
          {DUE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1.5">
        <span className="label flex items-center gap-1">금액 (선택)<Tip>만 원 단위로 입력해요. 30은 30만 원, 3.5는 3만 5천 원이에요. 입력한 금액은 예산 탭에 반영돼요</Tip></span>
        <span className="relative block">
          <input name="amount" defaultValue={amount} placeholder="예: 30" inputMode="decimal" maxLength={20} className="input num pr-14" />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">만 원</span>
        </span>
      </label>
      <label className="block space-y-1.5">
        <span className="label">결제일</span>
        <input name="date" type="date" defaultValue={date} required className="input" />
      </label>
      <label className="block space-y-1.5">
        <span className="label">메모 (선택)</span>
        <input name="memo" defaultValue={memo} placeholder="예: 계좌이체, 영수증 받기" maxLength={500} className="input" />
      </label>
      {isNew && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="paid" className="h-4 w-4 accent-[var(--color-save)]" />
          결제 완료
        </label>
      )}
    </>
  );
}

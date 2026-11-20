"use client";
import { useState } from "react";
import { DUE_SUGGESTIONS } from "@/lib/meta";
import { won } from "@/lib/money";
import { SuggestInput } from "./SuggestInput";

const groupDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 추가 화면(/new)의 '결제' 칸: 결제 예정 / 결제 완료, 항목, 금액(원 단위), 날짜, 메모.
 * 저장하면 결제·지출 기록 하나가 생기고, 영수증은 그 상세 화면에서 붙임
 */
export function DueFields({ date = "" }: { date?: string }) {
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const n = Number(amount.replace(/,/g, ""));
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: false, label: "결제 예정" },
          { v: true, label: "결제 완료" },
        ].map((o) => (
          <label
            key={o.label}
            className={`cursor-pointer rounded-xl border py-2 text-center text-[14px] font-bold ${paid === o.v ? "border-save bg-save-soft" : "border-line text-sub"}`}
          >
            <input type="radio" name="status" value={o.v ? "paid" : "planned"} checked={paid === o.v} onChange={() => setPaid(o.v)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="due-title" className="label block">항목</label>
        <SuggestInput id="due-title" name="title" append suggestions={DUE_SUGGESTIONS} placeholder="예: 드레스 잔금" required maxLength={60} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="due-amount" className="label block">{paid ? "낸 금액" : "낼 금액 (모르면 비워 두기)"}</label>
        <span className="relative block">
          <input
            id="due-amount"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(groupDigits(e.target.value))}
            placeholder="예: 400,000"
            inputMode="numeric"
            autoComplete="off"
            required={paid}
            className="input num pr-9 text-right"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">원</span>
        </span>
        {n >= 10_000 && <p className="num px-1 text-right text-[12px] text-sub">{won(n)}</p>}
      </div>
      <label className="block space-y-1.5">
        <span className="label">{paid ? "결제일" : "낼 날"}</span>
        <input name="date" type="date" defaultValue={date} required className="input" />
      </label>
      <label className="block space-y-1.5">
        <span className="label">메모 (선택)</span>
        <input name="memo" placeholder="예: 계좌이체, 영수증 받기" maxLength={1000} className="input" />
      </label>
    </>
  );
}

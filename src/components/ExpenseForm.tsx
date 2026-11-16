"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addReceipt, saveExpense } from "@/app/actions";
import { EXPENSE_SUGGESTIONS } from "@/lib/meta";
import { won } from "@/lib/money";
import { shrink } from "@/lib/shrink";
import { SuggestInput } from "./SuggestInput";

const MAX_RECEIPTS = 10;

type Existing = { id: string; width: number; height: number };
type Initial = { id?: string; title?: string; amount?: number | null; date: string; memo?: string; paid?: boolean };

const groupDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 결제·지출 작성·수정 (작성 화면). '결제 완료'(낸 돈) / '결제 예정'(낼 날·금액)을 고르고,
 * 칸을 먼저 저장한 뒤 새로 고른 증빙 이미지를 줄여서 한 장씩 올림.
 * 업로드가 중간에 실패하면 지출은 이미 저장된 상태라 그 id 로 다시 시도(중복으로 안 생김)
 * 카테고리·이벤트 칸은 서버에서 그린 걸 받아서 끼움
 */
export function ExpenseForm({
  initial,
  receipts = [],
  categoryField,
  eventField,
}: {
  initial: Initial;
  receipts?: Existing[];
  categoryField: ReactNode;
  eventField: ReactNode;
}) {
  const router = useRouter();
  const [savedId, setSavedId] = useState(initial.id ?? "");
  const [amount, setAmount] = useState(initial.amount ? groupDigits(String(initial.amount)) : "");
  const [paid, setPaid] = useState(initial.paid ?? true);
  const [removed, setRemoved] = useState<string[]>([]);
  // 저장하면서 이미 지운 증빙 (업로드가 중간에 실패해도 다시 보이지 않게)
  const [gone, setGone] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = !!status;
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const kept = receipts.filter((r) => !removed.includes(r.id) && !gone.includes(r.id));
  const room = MAX_RECEIPTS - kept.length - files.length;
  const amountNum = Number(amount.replace(/,/g, ""));

  const pick = (list: FileList | null) => {
    const picked = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    const fit = picked.slice(0, Math.max(0, room));
    setError(picked.length > fit.length ? `증빙은 지출 하나에 ${MAX_RECEIPTS}장까지예요. ${fit.length}장만 추가했어요` : "");
    setFiles((prev) => [...prev, ...fit]);
  };

  const submit = async (form: HTMLFormElement) => {
    setError("");
    try {
      setStatus("저장 중…");
      const fd = new FormData(form);
      fd.set("id", savedId);
      fd.delete("removeReceipt");
      for (const id of removed) fd.append("removeReceipt", id);
      const saved = await saveExpense(fd);
      if (!saved.ok) throw new Error(saved.error);
      setSavedId(saved.id);
      setGone((g) => [...g, ...removed]);
      setRemoved([]);
      // 한 장씩 올리고, 올라간 건 목록에서 빼 둠 (실패하면 남은 것만 다시)
      const queue = [...files];
      for (let i = 0; i < queue.length; i++) {
        setStatus(`증빙 올리는 중 ${i + 1}/${queue.length}`);
        const full = await shrink(queue[i], 2000, 0.85);
        const thumb = await shrink(queue[i], 400, 0.75);
        const one = new FormData();
        one.set("expenseId", saved.id);
        one.set("photo", full.blob, "receipt.jpg");
        one.set("thumb", thumb.blob, "thumb.jpg");
        one.set("w", String(full.w));
        one.set("h", String(full.h));
        const r = await addReceipt(one);
        if (!r.ok) throw new Error(r.error);
        setFiles((prev) => prev.filter((f) => f !== queue[i]));
      }
      setStatus("완료");
      router.replace(`/expenses/${saved.id}`);
      router.refresh();
    } catch (e) {
      setStatus("");
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  return (
    <form
      className="card space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) submit(e.currentTarget);
      }}
    >
      <fieldset className="space-y-1.5">
        <legend className="label mb-1.5">상태</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, label: "결제 완료", sub: "이미 낸 돈" },
            { v: false, label: "결제 예정", sub: "낼 날·금액 챙기기" },
          ].map((o) => (
            <label
              key={o.label}
              className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center ${paid === o.v ? "border-save bg-save-soft" : "border-line"}`}
            >
              <input type="radio" name="status" value={o.v ? "paid" : "planned"} checked={paid === o.v} onChange={() => setPaid(o.v)} className="sr-only" />
              <span className="block text-[14px] font-bold">{o.label}</span>
              <span className="block text-[11px] text-sub">{o.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="expense-title" className="label block">항목</label>
        <SuggestInput id="expense-title" name="title" defaultValue={initial.title} suggestions={EXPENSE_SUGGESTIONS} placeholder="예: 드레스 잔금" required maxLength={60} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="expense-amount" className="label block">{paid ? "낸 금액" : "낼 금액 (모르면 비워 두기)"}</label>
        <span className="relative block">
          <input
            id="expense-amount"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(groupDigits(e.target.value))}
            placeholder="예: 1,250,000"
            inputMode="numeric"
            autoComplete="off"
            required={paid}
            className="input num pr-9 text-right"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">원</span>
        </span>
        {amountNum >= 10_000 && <p className="num px-1 text-right text-[12px] text-sub">{won(amountNum)}</p>}
      </div>

      <label className="block space-y-1.5">
        <span className="label">{paid ? "결제일" : "낼 날"}</span>
        <input name="date" type="date" defaultValue={initial.date} required className="input" />
      </label>

      {categoryField}
      {eventField}

      <label className="block space-y-1.5">
        <span className="label">메모 (선택)</span>
        <textarea name="memo" defaultValue={initial.memo} rows={2} maxLength={1000} placeholder="예: 카드 3개월 할부, 현금영수증 신청" className="input resize-none" />
      </label>

      <fieldset className="space-y-2">
        <legend className="label mb-1.5 flex w-full items-center justify-between">
          <span>증빙 자료 (선택)</span>
          <span className="num text-[12px] font-normal text-faint">
            {kept.length + files.length}/{MAX_RECEIPTS}
          </span>
        </legend>
        <ul className="grid grid-cols-3 gap-2">
          {kept.map((r) => (
            <Thumb key={r.id} src={`/api/receipts/${r.id}?size=thumb`} alt="저장된 증빙" onRemove={() => setRemoved((p) => [...p, r.id])} disabled={busy} />
          ))}
          {urls.map((u, i) => (
            <Thumb key={u} src={u} alt={`새 증빙 ${i + 1}`} isNew onRemove={() => setFiles((p) => p.filter((_, j) => j !== i))} disabled={busy} />
          ))}
          {room > 0 && (
            <li>
              <button
                type="button"
                onClick={() => picker.current?.click()}
                disabled={busy}
                className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line bg-paper text-sub disabled:opacity-50"
              >
                <span className="text-[22px] leading-none" aria-hidden>＋</span>
                <span className="text-[12px] font-semibold">이미지 추가</span>
              </button>
            </li>
          )}
        </ul>
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-[12px] text-faint">영수증·계약서·이체 내역 캡처 등. 여러 장 한 번에 고를 수 있어요</p>
        {removed.length > 0 && (
          <p className="text-[12px] text-spend">
            저장하면 증빙 {removed.length}장이 지워져요{" "}
            <button type="button" onClick={() => setRemoved([])} className="font-semibold underline underline-offset-2">
              되돌리기
            </button>
          </p>
        )}
      </fieldset>

      {error && <p role="alert" className="text-[13px] font-semibold text-spend">{error}</p>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn w-full disabled:opacity-60">
        {status || (savedId && files.length && !initial.id ? `남은 증빙 ${files.length}장 다시 올리기` : "저장")}
      </button>
    </form>
  );
}

function Thumb({ src, alt, onRemove, disabled, isNew }: { src: string; alt: string; onRemove: () => void; disabled: boolean; isNew?: boolean }) {
  return (
    <li className="relative aspect-square overflow-hidden rounded-xl bg-paper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {isNew && <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">새로</span>}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`${alt} 빼기`}
        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[13px] leading-none text-white"
      >
        ✕
      </button>
    </li>
  );
}

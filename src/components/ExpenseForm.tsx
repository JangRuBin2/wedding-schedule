"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addReceipt, appendReceiptChunk, finishReceiptFile, saveExpense, saveExpensePair, startReceiptFile } from "@/app/actions";
import { ACCEPT, CHUNK, fileMime, MAX_FILE, sizeLabel } from "@/lib/attach";
import { FileTile } from "./FileTile";
import { EXPENSE_SUGGESTIONS } from "@/lib/meta";
import { won } from "@/lib/money";
import { shrink } from "@/lib/shrink";
import { SuggestInput } from "./SuggestInput";

const MAX_RECEIPTS = 10;
/** '계약금·잔금 함께' 모드의 항목 추천 (뒤에 계약금·잔금이 붙음) */
const PAIR_SUGGESTIONS = ["드레스", "스튜디오", "메이크업", "웨딩홀", "플래너", "스냅", "본식 영상", "예물", "신혼여행"];

type Existing = { id: string; width: number; height: number; mime: string; name: string | null; size: number | null };

const isImage = (f: File) => f.type.startsWith("image/") && !fileMime(f.name);

/** 파일 하나를 2MB 씩 나눠 올림 (Vercel 요청 한도 4.5MB 때문에 한 번에 못 보냄) */
async function uploadFile(expenseId: string, file: File, onProgress: (pct: number) => void) {
  const start = await startReceiptFile(expenseId, { name: file.name, size: file.size });
  if (!start.ok) throw new Error(start.error);
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    const part = new FormData();
    part.set("id", start.id);
    part.set("offset", String(offset));
    part.set("chunk", file.slice(offset, offset + CHUNK), "chunk");
    // 조각 하나는 한 번 더 시도 (같은 조각을 두 번 보내도 서버가 한 번만 붙임)
    let r = await appendReceiptChunk(part).catch(() => null);
    if (!r?.ok) r = await appendReceiptChunk(part);
    if (!r.ok) throw new Error(r.error);
    onProgress(Math.min(100, Math.round(((offset + CHUNK) / file.size) * 100)));
  }
  const done = await finishReceiptFile(start.id);
  if (!done.ok) throw new Error(done.error);
}
type Initial = { id?: string; title?: string; amount?: number | null; date: string; memo?: string; paid?: boolean };

const groupDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 결제·지출 작성·수정 (작성 화면). '결제 완료'(낸 돈) / '결제 예정'(낼 날·금액)을 고르고,
 * 칸을 먼저 저장한 뒤 새로 고른 첨부를 하나씩 올림: 이미지는 줄여서, 파일(PDF·한글·엑셀 등 5MB 까지)은 그대로 나눠서.
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
  // 새로 적을 때만: 계약금·잔금을 한 화면에서 같이 적기
  const [pair, setPair] = useState(false);
  const [pairTotal, setPairTotal] = useState({ deposit: 0, balance: 0 });
  const isNew = !initial.id;
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
    const next = files.map((f) => (isImage(f) ? URL.createObjectURL(f) : ""));
    setUrls(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  const kept = receipts.filter((r) => !removed.includes(r.id) && !gone.includes(r.id));
  const room = MAX_RECEIPTS - kept.length - files.length;
  const amountNum = Number(amount.replace(/,/g, ""));

  const pick = (list: FileList | null) => {
    const problems: string[] = [];
    const picked = [...(list ?? [])].filter((f) => {
      if (isImage(f)) return true;
      if (!fileMime(f.name)) problems.push(`${f.name}: 이 형식은 첨부할 수 없어요`);
      else if (f.size > MAX_FILE) problems.push(`${f.name}: 5MB 가 넘어요 (${sizeLabel(f.size)})`);
      else return true;
      return false;
    });
    const fit = picked.slice(0, Math.max(0, room));
    if (picked.length > fit.length) problems.push(`첨부는 하나에 ${MAX_RECEIPTS}개까지예요. ${fit.length}개만 추가했어요`);
    setError(problems.join("\n"));
    setFiles((prev) => [...prev, ...fit]);
  };

  const submit = async (form: HTMLFormElement) => {
    setError("");
    try {
      setStatus("저장 중…");
      const fd = new FormData(form);
      let saved: { id: string };
      if (pair) {
        // 이미 둘 다 만들었고 첨부만 남았으면 다시 만들지 않음 (중복 방지)
        if (savedId) saved = { id: savedId };
        else {
          const r = await saveExpensePair(fd);
          if (!r.ok) throw new Error(r.error);
          saved = { id: r.ids[0] };
        }
      } else {
        fd.set("id", savedId);
        fd.delete("removeReceipt");
        for (const id of removed) fd.append("removeReceipt", id);
        const r = await saveExpense(fd);
        if (!r.ok) throw new Error(r.error);
        saved = r;
      }
      setSavedId(saved.id);
      setGone((g) => [...g, ...removed]);
      setRemoved([]);
      // 한 장씩 올리고, 올라간 건 목록에서 빼 둠 (실패하면 남은 것만 다시)
      const queue = [...files];
      for (let i = 0; i < queue.length; i++) {
        setStatus(`첨부 올리는 중 ${i + 1}/${queue.length}`);
        if (!isImage(queue[i])) {
          await uploadFile(saved.id, queue[i], (pct) => setStatus(`첨부 올리는 중 ${i + 1}/${queue.length} · ${pct}%`));
          setFiles((prev) => prev.filter((f) => f !== queue[i]));
          continue;
        }
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
      // 함께 적었으면 두 개가 다 보이는 내역으로
      router.replace(pair ? "/expenses" : `/expenses/${saved.id}`);
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
      {isNew && (
        <fieldset className="space-y-1.5" disabled={!!savedId}>
          <legend className="label mb-1.5">기록 방식</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
            {[
              { v: false, label: "하나만" },
              { v: true, label: "계약금 + 잔금 함께" },
            ].map((o) => (
              <label
                key={o.label}
                className={`cursor-pointer rounded-lg py-2 text-center text-[13px] font-semibold ${pair === o.v ? "bg-card shadow-sm" : "text-sub"}`}
              >
                <input type="radio" name="mode" value={o.v ? "pair" : "one"} checked={pair === o.v} onChange={() => setPair(o.v)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {pair ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="expense-title" className="label block">항목</label>
            <SuggestInput key="pair" id="expense-title" name="title" suggestions={PAIR_SUGGESTIONS} placeholder="예: 드레스" required maxLength={50} />
            <p className="px-1 text-[12px] text-faint">뒤에 &apos;계약금&apos;·&apos;잔금&apos;이 붙어 두 건으로 저장돼요 (예: 드레스 계약금, 드레스 잔금)</p>
          </div>
          <PairPart
            name="deposit"
            label="계약금"
            date={initial.date}
            initialPaid
            onAmount={(n) => setPairTotal((t) => ({ ...t, deposit: n }))}
          />
          <PairPart
            name="balance"
            label="잔금"
            date=""
            initialPaid={false}
            onAmount={(n) => setPairTotal((t) => ({ ...t, balance: n }))}
          />
          {pairTotal.deposit + pairTotal.balance > 0 && (
            <p className="flex items-baseline justify-between px-1 text-[13px]">
              <span className="text-sub">합계</span>
              <span className="num font-semibold">{won(pairTotal.deposit + pairTotal.balance)}</span>
            </p>
          )}
        </>
      ) : (
      <>
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
        <SuggestInput key="one" id="expense-title" name="title" defaultValue={initial.title} append suggestions={EXPENSE_SUGGESTIONS} placeholder="예: 드레스 잔금" required maxLength={60} />
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
      </>
      )}

      {categoryField}
      {eventField}

      <label className="block space-y-1.5">
        <span className="label">메모 (선택)</span>
        <textarea name="memo" defaultValue={initial.memo} rows={2} maxLength={1000} placeholder="예: 카드 3개월 할부, 현금영수증 신청" className="input resize-none" />
      </label>

      <fieldset className="space-y-2">
        <legend className="label mb-1.5 flex w-full items-center justify-between">
          <span>첨부 (선택)</span>
          <span className="num text-[12px] font-normal text-faint">
            {kept.length + files.length}/{MAX_RECEIPTS}
          </span>
        </legend>
        <ul className="grid grid-cols-3 gap-2">
          {kept.map((r) => (
            <Thumb
              key={r.id}
              src={r.name ? "" : `/api/receipts/${r.id}?size=thumb`}
              file={r.name ? { name: r.name, size: r.size ?? 0 } : undefined}
              alt={r.name ?? "저장된 증빙"}
              onRemove={() => setRemoved((p) => [...p, r.id])}
              disabled={busy}
            />
          ))}
          {files.map((f, i) => (
            <Thumb
              key={`${f.name}-${f.size}-${i}`}
              src={urls[i] ?? ""}
              file={isImage(f) ? undefined : { name: f.name, size: f.size }}
              alt={isImage(f) ? `새 증빙 ${i + 1}` : f.name}
              isNew
              onRemove={() => setFiles((p) => p.filter((_, j) => j !== i))}
              disabled={busy}
            />
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
                <span className="text-[12px] font-semibold">이미지·파일</span>
              </button>
            </li>
          )}
        </ul>
        <input
          ref={picker}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        {pair && <p className="text-[12px] text-faint">첨부는 계약금 쪽에 붙어요</p>}
        <p className="text-[12px] text-faint">영수증·이체 내역 캡처 같은 이미지(자동으로 줄임)와 계약서 PDF·한글·워드·엑셀 파일(5MB 까지). 여러 개 한 번에 고를 수 있어요</p>
        {removed.length > 0 && (
          <p className="text-[12px] text-spend">
            저장하면 첨부 {removed.length}개가 지워져요{" "}
            <button type="button" onClick={() => setRemoved([])} className="font-semibold underline underline-offset-2">
              되돌리기
            </button>
          </p>
        )}
      </fieldset>

      {error && <p role="alert" className="text-[13px] font-semibold whitespace-pre-line text-spend">{error}</p>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn w-full disabled:opacity-60">
        {status || (savedId && files.length && !initial.id ? `남은 증빙 ${files.length}장 다시 올리기` : "저장")}
      </button>
    </form>
  );
}

/** '계약금 + 잔금 함께' 모드의 한 건: 상태(완료/예정)·금액·날짜. 칸 이름은 deposit.amount 처럼 앞에 name 이 붙음 */
function PairPart({
  name,
  label,
  date,
  initialPaid,
  onAmount,
}: {
  name: string;
  label: string;
  date: string;
  initialPaid: boolean;
  onAmount: (n: number) => void;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [amount, setAmount] = useState("");
  const n = Number(amount.replace(/,/g, ""));
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-3.5">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold">{label}</span>
        <div className="flex gap-1 rounded-lg bg-paper p-0.5">
          {[
            { v: true, label: "결제 완료" },
            { v: false, label: "결제 예정" },
          ].map((o) => (
            <label
              key={o.label}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-semibold ${paid === o.v ? "bg-save-soft text-ink" : "text-sub"}`}
            >
              <input
                type="radio"
                name={`${name}.status`}
                value={o.v ? "paid" : "planned"}
                checked={paid === o.v}
                onChange={() => setPaid(o.v)}
                aria-label={`${label} ${o.label}`}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <span className="relative block">
          <input
            id={`expense-${name}-amount`}
            name={`${name}.amount`}
            value={amount}
            onChange={(e) => {
              const v = groupDigits(e.target.value);
              setAmount(v);
              onAmount(Number(v.replace(/,/g, "")) || 0);
            }}
            placeholder={paid ? "낸 금액" : "낼 금액 (선택)"}
            aria-label={`${label} ${paid ? "낸 금액" : "낼 금액"}`}
            inputMode="numeric"
            autoComplete="off"
            required={paid}
            className="input num pr-9 text-right"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">원</span>
        </span>
        <input
          id={`expense-${name}-date`}
          name={`${name}.date`}
          type="date"
          defaultValue={date}
          required
          aria-label={`${label} ${paid ? "결제일" : "낼 날"}`}
          className="input w-[9.5rem]"
        />
      </div>
      {n >= 10_000 && <p className="num px-1 text-right text-[12px] text-sub">{won(n)}</p>}
    </fieldset>
  );
}

function Thumb({
  src,
  alt,
  onRemove,
  disabled,
  isNew,
  file,
}: {
  src: string;
  alt: string;
  onRemove: () => void;
  disabled: boolean;
  isNew?: boolean;
  file?: { name: string; size: number };
}) {
  return (
    <li className="relative aspect-square overflow-hidden rounded-xl bg-paper">
      {file ? (
        <FileTile name={file.name} size={file.size} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
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

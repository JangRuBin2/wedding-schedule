"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addReceipt, appendReceiptChunk, finishReceiptFile, saveExpenseGroup, startReceiptFile } from "@/app/actions";
import { ACCEPT, CHUNK, fileMime, MAX_FILE, sizeLabel } from "@/lib/attach";
import { PART_LABELS, type ExpensePart as Part, type ReceiptInfo } from "@/lib/meta";
import { won } from "@/lib/money";
import { shrink } from "@/lib/shrink";
import { FileTile } from "./FileTile";
import { SuggestInput } from "./SuggestInput";

const MAX_RECEIPTS = 10;
/** 항목 이름 추천 (뒤에 결제 이름이 붙음) */
const NEW_SUGGESTIONS = ["드레스", "스튜디오", "헤어 메이크업", "웨딩홀", "플래너", "스냅", "본식 영상", "예물", "신혼여행", "식대", "부케", "청첩장 인쇄", "답례품"];
const toNum = (s: string) => Number(s.replace(/,/g, "")) || 0;
/** 저장할 칸: 금액을 적었거나, 결제 예정인데 날짜를 골랐으면 */
const isActive = (p: Part) => toNum(p.amount) > 0 || (!p.paid && !!p.date);
const groupDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const isImage = (f: File) => f.type.startsWith("image/") && !fileMime(f.name);
const blank = (key: number, label: string, paid: boolean, date = ""): Part => ({ key, label, paid, amount: "", date, memo: "", receipts: [] });

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

async function uploadImage(expenseId: string, file: File) {
  const full = await shrink(file, 2000, 0.85);
  const thumb = await shrink(file, 400, 0.75);
  const one = new FormData();
  one.set("expenseId", expenseId);
  one.set("photo", full.blob, "receipt.jpg");
  one.set("thumb", thumb.blob, "thumb.jpg");
  one.set("w", String(full.w));
  one.set("h", String(full.h));
  const r = await addReceipt(one);
  if (!r.ok) throw new Error(r.error);
}

/** 수정이면 groupId·title(항목 이름)·parts(그 항목의 결제들), focus 는 연 결제 (저장 뒤 그 화면으로) */
type Initial = { groupId?: string; title?: string; date: string; paid?: boolean; parts?: Part[]; focus?: string };

/**
 * 결제·지출 항목 작성·수정 (작성 화면). 항목(이름·카테고리·이벤트) 아래 결제 칸(계약금·잔금…)마다 상태·금액·날짜·메모·첨부.
 * 칸을 먼저 저장한 뒤 칸마다 새로 고른 첨부를 하나씩 올림: 이미지는 줄여서, 파일(PDF·한글·엑셀 등 5MB 까지)은 그대로 나눠서.
 * 업로드가 중간에 실패하면 결제는 이미 저장된 상태라 받은 id 로 다시 시도(중복으로 안 생김).
 * 저장된 결제는 ✕ 로 지울 수 있음 (저장할 때 지워짐, 그 전엔 되돌리기). 카테고리·이벤트 칸은 서버에서 그린 걸 받아서 끼움
 */
export function ExpenseForm({ initial, categoryField, eventField }: { initial: Initial; categoryField: ReactNode; eventField: ReactNode }) {
  const router = useRouter();
  const isNew = !initial.groupId;
  const [groupId, setGroupId] = useState(initial.groupId ?? "");
  const [parts, setParts] = useState<Part[]>(
    () =>
      initial.parts ?? [
        // 결제 예정으로 시작하면 날짜는 비워 둠 (날짜만으로도 저장 대상이 되니까)
        blank(1, "계약금", initial.paid ?? true, initial.paid === false ? "" : initial.date),
        blank(2, "잔금", false),
      ],
  );
  // 지울 저장된 결제 (저장할 때 지움)
  const [deleted, setDeleted] = useState<Part[]>([]);
  // 칸마다 새로 고른 첨부, 지울 저장된 첨부
  const [files, setFiles] = useState<Record<number, File[]>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = !!status;

  const active = parts.filter(isActive);
  const activeSum = active.reduce((n, p) => n + toNum(p.amount), 0);
  const toSend = parts.filter((p) => p.id || isActive(p));
  const pending = Object.values(files).reduce((n, f) => n + f.length, 0);
  const patch = (key: number, v: Partial<Part>) => setParts((ps) => ps.map((x) => (x.key === key ? { ...x, ...v } : x)));

  const submit = async (form: HTMLFormElement) => {
    setError("");
    try {
      // 적다 만 칸(메모·첨부만 있고 금액·날짜 없음)은 그냥 버려지지 않게 알려 줌
      const half = parts.find((p) => !p.id && !isActive(p) && (p.memo.trim() || files[p.key]?.length));
      if (half) throw new Error(`${half.label}: 금액이나 날짜를 적어 주세요`);
      if (!toSend.length) throw new Error("결제 금액이나 날짜를 하나 이상 적어 주세요");
      setStatus("저장 중…");
      const fd = new FormData(form);
      fd.set("groupId", groupId);
      fd.set("parts", JSON.stringify(toSend.map(({ id, label, paid, amount, date, memo }) => ({ id, label, paid, amount, date, memo }))));
      fd.delete("deleted");
      for (const d of deleted) if (d.id) fd.append("deleted", d.id);
      fd.delete("removeReceipt");
      for (const id of removed) fd.append("removeReceipt", id);
      const r = await saveExpenseGroup(fd);
      if (!r.ok) throw new Error(r.error);
      setGroupId(r.groupId);
      setDeleted([]);
      // 만든 결제의 id 를 칸에 기억 + 지운 첨부는 칸에서 뺌 (첨부 업로드가 실패해 다시 저장해도 또 만들지 않고 고침)
      const idOf = new Map(toSend.map((p, i) => [p.key, r.ids[i]]));
      setParts((ps) =>
        ps.map((p) => ({ ...p, id: idOf.get(p.key) ?? p.id, receipts: p.receipts.filter((x) => !removed.includes(x.id)) })),
      );
      setRemoved([]);
      // 칸마다 첨부를 한 장씩 올리고, 올라간 건 목록에서 빼 둠 (실패하면 남은 것만 다시)
      const queue = toSend.flatMap((p) => (files[p.key] ?? []).map((f) => ({ key: p.key, id: idOf.get(p.key)!, f })));
      for (let i = 0; i < queue.length; i++) {
        const { key, id, f } = queue[i];
        const label = `첨부 올리는 중 ${i + 1}/${queue.length}`;
        setStatus(label);
        if (isImage(f)) await uploadImage(id, f);
        else await uploadFile(id, f, (pct) => setStatus(`${label} · ${pct}%`));
        setFiles((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((x) => x !== f) }));
      }
      setStatus("완료");
      // 상세 화면은 항목 전체를 보여 줌: 수정이면 연 결제, 새로 적었으면 첫 결제로
      const focus = initial.focus && r.ids.includes(initial.focus) ? initial.focus : r.ids[0];
      router.replace(`/expenses/${focus}`);
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
      <div className="space-y-1.5">
        <label htmlFor="expense-title" className="label block">항목</label>
        <SuggestInput id="expense-title" name="title" defaultValue={initial.title} suggestions={NEW_SUGGESTIONS} placeholder="예: 헤어 메이크업" required maxLength={50} />
      </div>

      {categoryField}
      {eventField}

      <fieldset className="space-y-2.5">
        <legend className="label mb-1.5 flex w-full items-baseline justify-between">
          <span>결제</span>
          <span className="text-[12px] font-normal text-faint">금액이나 날짜를 적은 것만 저장돼요</span>
        </legend>
        {parts.map((pt, i) => (
          <PartRow
            key={pt.key}
            part={pt}
            index={i}
            files={files[pt.key] ?? []}
            removed={removed}
            disabled={busy}
            onChange={(v) => patch(pt.key, v)}
            onFiles={(fs) => setFiles((prev) => ({ ...prev, [pt.key]: fs }))}
            onRemoveReceipt={(id) => setRemoved((r) => [...r, id])}
            onError={setError}
            onRemove={
              parts.length > 1
                ? () => {
                    setParts((ps) => ps.filter((x) => x.key !== pt.key));
                    setFiles((prev) => ({ ...prev, [pt.key]: [] }));
                    if (pt.id) setDeleted((d) => [...d, pt]);
                  }
                : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={() => setParts((ps) => [...ps, blank(Date.now(), ps.some((p) => p.label === "잔금") ? "중도금" : "잔금", false)])}
          className="w-full rounded-xl border border-dashed border-line py-2.5 text-[13px] font-semibold text-sub"
        >
          + 결제 더하기 (중도금·추가금)
        </button>
        {deleted.length > 0 && (
          <p className="px-1 text-[12px] text-spend">
            저장하면 {deleted.map((d) => d.label).join("·")} 결제가 지워져요 (첨부 포함){" "}
            <button
              type="button"
              onClick={() => {
                setParts((ps) => [...ps, ...deleted]);
                setDeleted([]);
              }}
              className="font-semibold underline underline-offset-2"
            >
              되돌리기
            </button>
          </p>
        )}
        {active.length > 0 && (
          <p className="flex items-baseline justify-between px-1 text-[13px]">
            <span className="text-sub">결제 {active.length}건</span>
            {activeSum > 0 && <span className="num font-semibold">합계 {won(activeSum)}</span>}
          </p>
        )}
      </fieldset>

      {error && <p role="alert" className="text-[13px] font-semibold whitespace-pre-line text-spend">{error}</p>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn w-full disabled:opacity-60">
        {status || (groupId && pending && isNew ? `남은 첨부 ${pending}개 다시 올리기` : "저장")}
      </button>
    </form>
  );
}

/** 결제 한 건: 이름(계약금·잔금 등)·상태·금액·날짜, 그리고 펼치면 메모·첨부. 값은 위(ExpenseForm)에서 들고 있음 */
function PartRow({
  part,
  index,
  files,
  removed,
  disabled,
  onChange,
  onFiles,
  onRemoveReceipt,
  onError,
  onRemove,
}: {
  part: Part;
  index: number;
  files: File[];
  removed: string[];
  disabled: boolean;
  onChange: (v: Partial<Part>) => void;
  onFiles: (fs: File[]) => void;
  onRemoveReceipt: (id: string) => void;
  onError: (msg: string) => void;
  onRemove?: () => void;
}) {
  const n = toNum(part.amount);
  const on = isActive(part);
  const id = (k: string) => (index === 0 ? `expense-${k}` : `expense-${k}-${index + 1}`);
  const kept = part.receipts.filter((r) => !removed.includes(r.id));
  const [open, setOpen] = useState(!!part.memo || part.receipts.length > 0);
  const extras = kept.length + files.length;
  return (
    <div className={`space-y-2.5 rounded-xl border p-3 ${on || part.id ? "border-save" : "border-line"}`}>
      <div className="flex items-center gap-2">
        <select
          value={part.label}
          onChange={(e) => onChange({ label: e.target.value })}
          aria-label={`${index + 1}번째 결제 이름`}
          className="select !py-1 text-[14px] font-bold"
        >
          {PART_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-0.5 rounded-lg bg-paper p-0.5">
          {[
            { v: true, label: "완료" },
            { v: false, label: "예정" },
          ].map((o) => (
            <button
              type="button"
              key={o.label}
              onClick={() => onChange({ paid: o.v })}
              aria-pressed={part.paid === o.v}
              aria-label={`${part.label} 결제 ${o.label}`}
              className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${part.paid === o.v ? "bg-save-soft text-ink" : "text-sub"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} disabled={disabled} aria-label={`${part.label} 결제 지우기`} className="px-1 text-[14px] text-faint">
            ✕
          </button>
        )}
      </div>
      <span className="relative block">
        <input
          id={id("amount")}
          value={part.amount}
          onChange={(e) => onChange({ amount: groupDigits(e.target.value) })}
          placeholder={part.paid ? "낸 금액" : "낼 금액 (모르면 비워 두기)"}
          aria-label={`${part.label} 금액`}
          inputMode="numeric"
          autoComplete="off"
          required={part.paid && (on || !!part.id)}
          className="input num pr-9 text-right"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">원</span>
      </span>
      {n >= 10_000 && <p className="num -mt-1 px-1 text-right text-[12px] text-sub">{won(n)}</p>}
      <label className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[13px] text-sub">{part.paid ? "결제일" : "낼 날"}</span>
        <input id={id("date")} type="date" value={part.date} onChange={(e) => onChange({ date: e.target.value })} required={on || !!part.id} className="input" />
      </label>

      {open ? (
        <div className="space-y-2.5 border-t border-line pt-2.5">
          <textarea
            id={id("memo")}
            value={part.memo}
            onChange={(e) => onChange({ memo: e.target.value })}
            aria-label={`${part.label} 메모`}
            rows={2}
            maxLength={1000}
            placeholder="메모 (예: 카드 3개월 할부, 현금영수증 신청)"
            className="input resize-none text-[14px]"
          />
          <Attachments
            label={part.label}
            kept={kept}
            files={files}
            disabled={disabled}
            onFiles={onFiles}
            onRemoveReceipt={onRemoveReceipt}
            onError={onError}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-[12px] font-semibold text-sub">
          + 메모·첨부{extras > 0 && ` (${extras})`}
        </button>
      )}
    </div>
  );
}

/** 결제 한 건의 첨부: 저장된 것 + 새로 고른 것, 그리고 더하기 */
function Attachments({
  label,
  kept,
  files,
  disabled,
  onFiles,
  onRemoveReceipt,
  onError,
}: {
  label: string;
  kept: ReceiptInfo[];
  files: File[];
  disabled: boolean;
  onFiles: (fs: File[]) => void;
  onRemoveReceipt: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => (isImage(f) ? URL.createObjectURL(f) : ""));
    setUrls(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);
  const room = MAX_RECEIPTS - kept.length - files.length;

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
    if (picked.length > fit.length) problems.push(`첨부는 결제 하나에 ${MAX_RECEIPTS}개까지예요. ${fit.length}개만 추가했어요`);
    onError(problems.join("\n"));
    onFiles([...files, ...fit]);
  };

  return (
    <div className="space-y-1.5">
      <ul className="grid grid-cols-4 gap-2">
        {kept.map((r) => (
          <Thumb
            key={r.id}
            src={r.name ? "" : `/api/receipts/${r.id}?size=thumb`}
            file={r.name ? { name: r.name, size: r.size ?? 0 } : undefined}
            alt={r.name ?? `${label} 증빙`}
            onRemove={() => onRemoveReceipt(r.id)}
            disabled={disabled}
          />
        ))}
        {files.map((f, i) => (
          <Thumb
            key={`${f.name}-${f.size}-${i}`}
            src={urls[i] ?? ""}
            file={isImage(f) ? undefined : { name: f.name, size: f.size }}
            alt={isImage(f) ? `${label} 새 증빙 ${i + 1}` : f.name}
            isNew
            onRemove={() => onFiles(files.filter((_, j) => j !== i))}
            disabled={disabled}
          />
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={disabled}
              aria-label={`${label} 첨부 더하기`}
              className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line bg-paper text-sub disabled:opacity-50"
            >
              <span className="text-[20px] leading-none" aria-hidden>＋</span>
              <span className="text-[11px] font-semibold">첨부</span>
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
        aria-label={`${label} 첨부 고르기`}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-faint">영수증·이체 캡처(자동으로 줄임), 계약서 PDF·한글·워드·엑셀(5MB 까지)</p>
    </div>
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

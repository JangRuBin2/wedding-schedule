import { extOf, sizeLabel } from "@/lib/attach";

/** 파일 첨부 칸 모양 (확장자 + 이름 + 크기). 작성 화면·상세 화면 공통 */
export function FileTile({ name, size }: { name: string; size: number }) {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-line bg-card p-2 text-center">
      <span className="rounded-md bg-save-soft px-1.5 py-0.5 text-[11px] font-bold text-save uppercase">{extOf(name) || "파일"}</span>
      <span className="line-clamp-2 w-full text-[11px] leading-tight break-all text-ink">{name}</span>
      <span className="num text-[10px] text-faint">{sizeLabel(size)}</span>
    </span>
  );
}

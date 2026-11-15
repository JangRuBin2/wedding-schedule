"use client";
import { useEffect, useState, useTransition } from "react";
import { addPhotos } from "@/app/actions";
import { shrink } from "@/lib/shrink";

const MAX_FILES = 6;

/** 사진 올리기 (작성 화면). 고르면 미리보기, 저장을 누르면 줄여서 올리고 이벤트 화면으로 */
export function PhotoUploader({ eventId }: { eventId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const submit = () =>
    start(async () => {
      setError("");
      try {
        const fd = new FormData();
        fd.set("eventId", eventId);
        for (const f of files) {
          const full = await shrink(f, 1600, 0.82);
          const thumb = await shrink(f, 400, 0.75);
          fd.append("photo", full.blob, "photo.jpg");
          fd.append("thumb", thumb.blob, "thumb.jpg");
          fd.append("w", String(full.w));
          fd.append("h", String(full.h));
        }
        await addPhotos(fd);
      } catch (e) {
        // redirect 는 에러처럼 던져지지만 Next 가 처리하므로 그 외 진짜 실패만 보여 줌
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError(e.message || "업로드에 실패했어요. 다시 시도해 주세요");
        else throw e;
      }
    });

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-paper py-8 text-center">
        <span className="text-[24px] text-sub" aria-hidden>＋</span>
        <span className="text-[14px] font-semibold">사진 선택</span>
        <span className="text-[12px] text-sub">최대 {MAX_FILES}장</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])].filter((f) => f.type.startsWith("image/"));
            setError(picked.length > MAX_FILES ? `한 번에 최대 ${MAX_FILES}장까지 올릴 수 있어요. 앞의 ${MAX_FILES}장만 선택했어요` : "");
            setFiles(picked.slice(0, MAX_FILES));
          }}
        />
      </label>
      {urls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <li key={u} className="relative aspect-square overflow-hidden rounded-xl bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`고른 사진 ${i + 1}`} className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-[13px] font-semibold text-spend">{error}</p>}
      <button type="button" onClick={submit} disabled={!files.length || pending} className="btn w-full disabled:opacity-50" aria-busy={pending}>
        {pending ? "업로드 중…" : files.length ? `사진 ${files.length}장 저장` : "저장"}
      </button>
    </div>
  );
}

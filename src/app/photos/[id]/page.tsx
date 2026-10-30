import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { shortDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** 사진 크게 보기 (보기 화면). 삭제는 따로 작성 화면에서 */
export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.photo.findUnique({
    where: { id },
    select: { id: true, width: true, height: true, createdAt: true, createdBy: true, event: { select: { id: true, title: true } } },
  });
  if (!p) notFound();
  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/events/${p.event.id}`} className="text-[13px] font-semibold text-sub">‹ {p.event.title}</Link>
        <Link href={`/photos/${p.id}/delete`} className="text-[13px] font-semibold text-spend">삭제</Link>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${p.id}`} alt={`${p.event.title} 사진`} width={p.width} height={p.height} className="h-auto w-full rounded-[18px] bg-card" />
      <p className="px-1 text-[12px] text-sub">
        {shortDate(p.createdAt)}에 올림{p.createdBy && ` · ${p.createdBy}`} ·{" "}
        <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">원본 열기</a>
      </p>
    </main>
  );
}

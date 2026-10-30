import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deletePhoto } from "../../../actions";

export const dynamic = "force-dynamic";

/** 사진 삭제 (작성 화면). 지우면 되돌릴 수 없어서 한 번 더 보여 주고 지움 */
export default async function DeletePhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.photo.findUnique({ where: { id }, select: { id: true, event: { select: { title: true } } } });
  if (!p) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/photos/${p.id}`} backLabel="취소" title="사진 삭제" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${p.id}?size=thumb`} alt="지울 사진" className="mx-auto max-h-64 rounded-xl" />
      <form action={deletePhoto.bind(null, p.id)}>
        <p className="text-center text-[14px] text-sub">삭제한 사진은 되돌릴 수 없어요</p>
        <SubmitButton pendingText="삭제 중…" className="mt-3 w-full !bg-spend">이 사진 삭제</SubmitButton>
      </form>
    </main>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PhotoUploader } from "@/components/PhotoUploader";
import { WriteHeader } from "@/components/WriteHeader";

export const dynamic = "force-dynamic";

export default async function NewPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="사진 추가" sub={`${e.title} · 참고 사진, 견적서, 시안 등`} />
      <div className="card">
        <PhotoUploader eventId={e.id} />
      </div>
    </main>
  );
}

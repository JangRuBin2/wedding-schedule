import { notFound } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { PhotoUploader } from "@/components/PhotoUploader";
import { WriteHeader } from "@/components/WriteHeader";

export const dynamic = "force-dynamic";

export default async function NewPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await scoped();
  const { id } = await params;
  const e = await db.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="사진 추가" sub="참고 사진, 견적서, 시안 등을 올려 두면 함께 볼 수 있어요" />
      <div className="card">
        <PhotoUploader eventId={e.id} />
      </div>
    </main>
  );
}

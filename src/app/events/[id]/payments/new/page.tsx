import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DueFields } from "@/components/DueFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { addDue } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function NewDuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="결제 추가" sub={e.title} />
      <form action={addDue} className="card space-y-5">
        <input type="hidden" name="eventId" value={e.id} />
        <DueFields isNew />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}

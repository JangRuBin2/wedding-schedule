import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { ymd } from "@/lib/dates";
import { EventFields } from "@/components/EventFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteEvent, updateEvent } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [e, cats] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { _count: { select: { tasks: true, dues: true } } } }),
    getCategories(),
  ]);
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="이벤트 수정" />
      <form action={updateEvent} className="card space-y-5">
        <input type="hidden" name="id" value={e.id} />
        <EventFields categories={cats} v={{ ...e, date: e.date ? ymd(e.date) : "" }} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      <form action={deleteEvent.bind(null, e.id)} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="지우는 중…">이 이벤트 삭제</SubmitButton>
        {(e._count.tasks > 0 || e._count.dues > 0) && (
          <p className="mt-1.5 text-[12px] text-sub">
            할 일 {e._count.tasks}개{e._count.dues > 0 && `, 결제 ${e._count.dues}개`}도 같이 지워져요
          </p>
        )}
      </form>
    </main>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ymd } from "@/lib/dates";
import { CategoryPicker } from "@/components/CategoryPicker";
import { DateField } from "@/components/DateField";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteEvent, updateEvent } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({ where: { id }, include: { _count: { select: { tasks: true, dues: true } } } });
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="이벤트 수정" />
      <form action={updateEvent} className="card space-y-5">
        <input type="hidden" name="id" value={e.id} />
        <label className="block space-y-1">
          <span className="label">이름</span>
          <input name="title" defaultValue={e.title} required maxLength={100} className="input" />
        </label>
        <CategoryPicker value={e.category} />
        <DateField defaultValue={e.date ? ymd(e.date) : ""} undated={false} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      <form action={deleteEvent.bind(null, e.id)} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="지우는 중…">이 이벤트 삭제</SubmitButton>
        {(e._count.tasks > 0 || e._count.dues > 0) && (
          <p className="mt-1.5 text-[12px] text-sub">
            할 일 {e._count.tasks}개{e._count.dues > 0 && `, 돈 낼 날 ${e._count.dues}개`}도 같이 지워져요
          </p>
        )}
      </form>
    </main>
  );
}

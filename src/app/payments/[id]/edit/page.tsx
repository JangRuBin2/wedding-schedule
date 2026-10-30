import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { safeBack } from "@/lib/back";
import { ymd } from "@/lib/dates";
import { DueFields } from "@/components/DueFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteDue, updateDue } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditDuePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string | string[] }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const d = await prisma.due.findUnique({ where: { id }, include: { event: { select: { id: true, title: true } } } });
  if (!d) notFound();
  const back = safeBack(sp.back, `/events/${d.event.id}`);
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="결제 수정" sub={d.event.title} />
      <form action={updateDue} className="card space-y-5">
        <input type="hidden" name="id" value={d.id} />
        <input type="hidden" name="back" value={back} />
        <DueFields title={d.title} amount={d.amount != null ? String(d.amount) : ""} date={ymd(d.date)} memo={d.memo ?? ""} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      <form action={deleteDue.bind(null, d.id, back)} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="지우는 중…">이 결제 삭제</SubmitButton>
      </form>
    </main>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { dateTimeLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** 증빙 크게 보기. 빼기는 지출 수정 화면에서 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await scoped();
  const { id } = await params;
  const r = await db.receipt.findUnique({
    where: { id },
    select: { id: true, width: true, height: true, name: true, ready: true, createdAt: true, createdBy: true, expense: { select: { id: true, title: true } } },
  });
  if (!r || !r.ready) notFound();
  // 파일 첨부는 이 화면 대신 파일 자체로 (PDF 는 열고, 나머지는 내려받기)
  if (r.name) redirect(`/api/receipts/${r.id}`);
  return (
    <main className="space-y-4">
      <Link href={`/expenses/${r.expense.id}`} className="block pt-2 text-[13px] font-semibold text-sub">‹ {r.expense.title}</Link>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/receipts/${r.id}`} alt={`${r.expense.title} 증빙`} width={r.width} height={r.height} className="h-auto w-full rounded-[18px] bg-card" />
      <p className="px-1 text-[12px] text-sub">
        {dateTimeLabel(r.createdAt)} 첨부{r.createdBy && ` · ${r.createdBy}`} ·{" "}
        <a href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">원본 열기</a>
      </p>
    </main>
  );
}

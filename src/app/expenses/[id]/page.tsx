import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { dateTimeLabel, daysUntil, dueLabel, fullDate } from "@/lib/dates";
import { setPaid } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FileTile } from "@/components/FileTile";
import { colorOf } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "@/components/CategoryDot";

export const dynamic = "force-dynamic";

/** 지출 상세 (보기 화면). 증빙 이미지, 등록·수정한 때와 사람. 고치기는 작성 화면에서 */
export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [x, cats] = await Promise.all([
    prisma.expense.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true } },
        receipts: { where: { ready: true }, orderBy: { createdAt: "asc" }, select: { id: true, createdBy: true, name: true, size: true, mime: true } },
      },
    }),
    getCategories(),
  ]);
  if (!x) notFound();
  // 저장 직후엔 createdAt 과 updatedAt 이 몇 ms 차이라 1초 넘게 벌어졌을 때만 '수정'으로 봄
  const edited = x.updatedAt.getTime() - x.createdAt.getTime() > 1000;
  const days = daysUntil(x.date, new Date());

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between pt-2">
        <Link href="/expenses" className="text-[13px] font-semibold text-sub">‹ 결제·지출 내역</Link>
        <Link href={`/expenses/${x.id}/edit`} className="text-[13px] font-semibold text-save">수정</Link>
      </div>

      <section className="hero space-y-1 p-5">
        <p className="flex items-center gap-1.5 text-[13px] text-sub">
          <CategoryDot color={colorOf(cats, x.category)} />
          {x.category}
          <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-bold ${x.paid ? "bg-card/70 text-sub" : "bg-save-soft text-save"}`}>
            {x.paid ? "결제 완료" : `결제 예정 · ${dueLabel(days)}`}
          </span>
        </p>
        <h1 className="text-[20px] leading-snug font-bold break-words">{x.title}</h1>
        {x.amount != null ? (
          <>
            <p className="num text-[28px] leading-tight font-bold">{x.amount.toLocaleString("ko-KR")}원</p>
            {x.amount >= 10_000 && <p className="num text-[13px] text-sub">{won(x.amount)}</p>}
          </>
        ) : (
          <p className="text-[18px] font-semibold text-sub">금액 미정</p>
        )}
        {!x.paid &&
          (x.amount == null ? (
            <Link href={`/expenses/${x.id}/edit?pay=1`} className="btn mt-3 block w-full text-center">
              금액 넣고 결제 완료로 바꾸기
            </Link>
          ) : (
            <form action={setPaid.bind(null, x.id, true)} className="pt-3">
              <SubmitButton pendingText="저장 중…" className="w-full">
                결제 완료로 바꾸기
              </SubmitButton>
            </form>
          ))}
      </section>

      <dl className="card ledger !py-1 text-[14px]">
        <Row label={x.paid ? "결제일" : "낼 날"} value={<span className={`num ${!x.paid && days < 0 ? "font-semibold text-spend" : ""}`}>{fullDate(x.date)}</span>} />
        {x.paid && x.paidAt && <Row label="결제 완료" value={<Who at={x.paidAt} by={x.paidBy} />} />}
        <Row
          label="이벤트"
          value={
            x.event ? (
              <Link href={`/events/${x.event.id}`} className="font-semibold text-save underline-offset-2 hover:underline">
                {x.event.title} ›
              </Link>
            ) : (
              <span className="text-faint">연결 안 함</span>
            )
          }
        />
        {x.memo && <Row label="메모" value={<span className="whitespace-pre-wrap break-words">{x.memo}</span>} />}
      </dl>

      <section>
        <h2 className="section-title">
          첨부 <small className="num">{x.receipts.length}개</small>
        </h2>
        {x.receipts.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {x.receipts.map((r, i) => (
              <li key={r.id}>
                {r.name ? (
                  // 파일: PDF 는 새 탭에서 열고, 나머지는 내려받기
                  <a href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer" className="block aspect-square" title={r.name}>
                    <FileTile name={r.name} size={r.size ?? 0} />
                  </a>
                ) : (
                  <Link href={`/receipts/${r.id}`} className="block aspect-square overflow-hidden rounded-xl bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/receipts/${r.id}?size=thumb`} alt={`증빙 ${i + 1}`} className="h-full w-full object-cover" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Link href={`/expenses/${x.id}/edit`} className="card block text-[14px] text-sub">
            아직 첨부가 없어요 <b className="font-semibold text-save">영수증·계약서 붙이기 ›</b>
          </Link>
        )}
      </section>

      <dl className="card ledger !py-1 text-[13px]">
        <Row label="등록" value={<Who at={x.createdAt} by={x.createdBy} />} />
        <Row label="마지막 수정" value={edited ? <Who at={x.updatedAt} by={x.updatedBy} /> : <span className="text-faint">수정한 적 없음</span>} />
      </dl>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-[76px] shrink-0 text-sub">{label}</dt>
      <dd className="min-w-0 flex-1 text-right">{value}</dd>
    </div>
  );
}

function Who({ at, by }: { at: Date; by: string | null }) {
  return (
    <span className="num">
      {dateTimeLabel(at)}
      {by && <b className="ml-1.5 font-semibold">· {by}</b>}
    </span>
  );
}

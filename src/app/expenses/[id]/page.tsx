import Link from "next/link";
import { notFound } from "next/navigation";
import { scoped } from "@/lib/tenant";
import { getCategories } from "@/lib/categories";
import { dateTimeLabel, daysUntil, dueLabel, fullDate } from "@/lib/dates";
import { deleteExpense, setPaid } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FileTile } from "@/components/FileTile";
import { colorOf, PART_LABELS, splitTitle } from "@/lib/meta";
import { won } from "@/lib/money";
import { CategoryDot } from "@/components/CategoryDot";

export const dynamic = "force-dynamic";

const RECEIPTS = { where: { ready: true }, orderBy: { createdAt: "asc" as const }, select: { id: true, name: true, size: true, mime: true } };
const order = (l: string) => (PART_LABELS as readonly string[]).indexOf(l);

type Pay = {
  id: string;
  label: string;
  title: string;
  amount: number | null;
  date: Date;
  paid: boolean;
  paidAt: Date | null;
  paidBy: string | null;
  memo: string | null;
  receipts: { id: string; name: string | null; size: number | null; mime: string }[];
};

/**
 * 결제·지출 항목 상세 (보기 화면). 주소는 결제 하나(캘린더·목록에서 누른 것)지만 그 항목의 결제를 다 보여 주고,
 * 누른 결제를 강조. 결제마다 메모·첨부·결제 완료·삭제. 고치기는 작성 화면에서
 */
export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const db = await scoped();
  const { id } = await params;
  const [x, cats] = await Promise.all([
    db.expense.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true } },
        receipts: RECEIPTS,
        group: {
          include: {
            event: { select: { id: true, title: true } },
            expenses: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], include: { receipts: RECEIPTS } },
          },
        },
      },
    }),
    getCategories(),
  ]);
  if (!x) notFound();
  const g = x.group ?? {
    title: splitTitle(x.title).base,
    category: x.category,
    event: x.event,
    expenses: [x],
    createdAt: x.createdAt,
    createdBy: x.createdBy,
    updatedAt: x.updatedAt,
    updatedBy: x.updatedBy,
  };
  const pays: Pay[] = [...g.expenses].sort((a: Pay, b: Pay) => order(a.label) - order(b.label));
  const sum = (xs: Pay[]) => xs.reduce((n, p) => n + (p.amount ?? 0), 0);
  const paidSum = sum(pays.filter((p) => p.paid));
  const plannedSum = sum(pays.filter((p) => !p.paid));
  const now = new Date();
  // 마지막 수정: 항목·결제 중 가장 늦게 바뀐 것
  const stamps: { updatedAt: Date; updatedBy: string | null }[] = [g, ...g.expenses].map((o: { updatedAt: Date; updatedBy: string | null }) => ({
    updatedAt: o.updatedAt,
    updatedBy: o.updatedBy,
  }));
  const last = stamps.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
  const edited = last.updatedAt.getTime() - g.createdAt.getTime() > 1000;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between pt-2">
        <Link href="/expenses" className="text-[13px] font-semibold text-sub">‹ 결제·지출 내역</Link>
        <Link href={`/expenses/${x.id}/edit`} className="text-[13px] font-semibold text-save">수정</Link>
      </div>

      <section className="hero space-y-1 p-5">
        <p className="flex items-center gap-1.5 text-[13px] text-sub">
          <CategoryDot color={colorOf(cats, g.category)} />
          {g.category}
          {g.event && (
            <Link href={`/events/${g.event.id}`} className="ml-auto truncate font-semibold text-save">
              {g.event.title} ›
            </Link>
          )}
        </p>
        <h1 className="text-[20px] leading-snug font-bold break-words">{g.title}</h1>
        <p className="num text-[28px] leading-tight font-bold">{(paidSum + plannedSum).toLocaleString("ko-KR")}원</p>
        <p className="num text-[13px] text-sub">
          낸 돈 {won(paidSum)}
          {pays.some((p) => !p.paid) && ` · 낼 돈 ${plannedSum ? won(plannedSum) : "금액 미정"}`}
        </p>
      </section>

      <section className="space-y-2.5">
        <h2 className="section-title">
          결제 <small className="num">{pays.length}건</small>
        </h2>
        {pays.map((p) => (
          <PayCard key={p.id} p={p} focus={p.id === x.id} now={now} />
        ))}
        <Link href={`/expenses/${x.id}/edit`} className="block rounded-xl border border-dashed border-line py-2.5 text-center text-[13px] font-semibold text-sub">
          + 결제 더하기·고치기
        </Link>
      </section>

      <dl className="card ledger !py-1 text-[13px]">
        <Row label="등록" value={<Who at={g.createdAt} by={g.createdBy} />} />
        <Row label="마지막 수정" value={edited ? <Who at={last.updatedAt} by={last.updatedBy} /> : <span className="text-faint">수정한 적 없음</span>} />
      </dl>
    </main>
  );
}

function PayCard({ p, focus, now }: { p: Pay; focus: boolean; now: Date }) {
  const days = daysUntil(p.date, now);
  return (
    <article id={`pay-${p.id}`} aria-current={focus || undefined} className={`card space-y-2.5 !p-4 ${focus ? "ring-2 ring-save" : ""}`}>
      <header className="flex items-center gap-2">
        <h3 className="text-[16px] font-bold">{p.label}</h3>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${p.paid ? "bg-paper text-sub" : "bg-save-soft text-save"}`}>
          {p.paid ? "결제 완료" : `결제 예정 · ${dueLabel(days)}`}
        </span>
        <span className={`num ml-auto text-[16px] font-bold ${p.amount == null ? "!font-normal text-faint" : ""}`}>
          {p.amount == null ? "금액 미정" : `${p.amount.toLocaleString("ko-KR")}원`}
        </span>
      </header>
      <p className="num text-[13px] text-sub">
        {p.paid ? "결제일" : "낼 날"} <span className={!p.paid && days < 0 ? "font-semibold text-spend" : "text-ink"}>{fullDate(p.date)}</span>
        {p.paid && p.paidAt && (
          <>
            {" · "}
            <Who at={p.paidAt} by={p.paidBy} />
          </>
        )}
      </p>
      {p.memo && <p className="rounded-lg bg-paper px-3 py-2 text-[13px] whitespace-pre-wrap break-words">{p.memo}</p>}
      {p.receipts.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {p.receipts.map((r, i) => (
            <li key={r.id}>
              {r.name ? (
                // 파일: PDF 는 새 탭에서 열고, 나머지는 내려받기
                <a href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer" className="block aspect-square" title={r.name}>
                  <FileTile name={r.name} size={r.size ?? 0} />
                </a>
              ) : (
                <Link href={`/receipts/${r.id}`} className="block aspect-square overflow-hidden rounded-xl bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/receipts/${r.id}?size=thumb`} alt={`${p.label} 증빙 ${i + 1}`} className="h-full w-full object-cover" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 pt-0.5">
        {!p.paid &&
          (p.amount == null ? (
            <Link href={`/expenses/${p.id}/edit?pay=1`} className="btn flex-1 !py-2 text-center text-[13px]">
              금액 넣고 결제 완료로 바꾸기
            </Link>
          ) : (
            <form action={setPaid.bind(null, p.id, true)} className="flex-1">
              <SubmitButton pendingText="저장 중…" className="w-full !py-2 text-[13px]">
                결제 완료로 바꾸기
              </SubmitButton>
            </form>
          ))}
        <form action={deleteExpense.bind(null, p.id, "/expenses")} className={p.paid ? "ml-auto" : ""}>
          <SubmitButton base="btn-ghost" className="!px-2 !py-2 text-[12px] !text-spend" pendingText="삭제 중…" confirm={`${p.label} 결제를 지울까요? 첨부도 같이 지워져요`}>
            삭제
          </SubmitButton>
        </form>
      </div>
    </article>
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

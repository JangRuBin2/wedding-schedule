import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateLabel, daysUntil, dueLabel, shortDate } from "@/lib/dates";
import { categoryColor } from "@/lib/meta";
import { ADMIN_SECTION, suggestionsFor } from "@/lib/templates";
import { CategoryDot } from "@/components/CategoryDot";
import { OptimisticCheck } from "@/components/OptimisticCheck";
import { SubmitButton } from "@/components/SubmitButton";
import { addSuggestedTasks, toggleDue, toggleEvent, toggleTask } from "../../actions";

export const dynamic = "force-dynamic";

/** 이벤트 보기 화면. 입력 칸은 없고, 추가·수정은 작성 화면으로 넘어감 (체크·'냈어요'처럼 한 번 누르면 끝나는 것만 여기서) */
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  const e = await prisma.event.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ done: "asc" }, { date: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      dues: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!e) notFound();

  const days = e.date ? daysUntil(e.date, now) : null;
  const suggestions = suggestionsFor(e.templateKey, e.tasks);
  const base = `/events/${e.id}`;

  return (
    <main className="space-y-7">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/events" className="text-[13px] font-semibold text-sub">‹ 이벤트</Link>
          <Link href={`${base}/edit`} className="text-[13px] font-semibold text-save">수정</Link>
        </div>
        <div className="hero flex items-start gap-3 p-5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[12px] text-cover-sub">
              <span className="h-2 w-2 rounded-full ring-2 ring-white/70" style={{ background: categoryColor(e.category) }} aria-hidden />
              {e.category}
            </p>
            <h1 className={`mt-0.5 text-[22px] leading-tight font-bold ${e.done ? "line-through decoration-2" : ""}`}>{e.title}</h1>
            <p className="num mt-1.5 text-[13px] text-cover-sub">
              {e.date ? `${dateLabel(e.date, now)} · ${dueLabel(days!)}` : "날짜 미정"}
              {e.done && ` · 완료 ${[e.doneBy, e.doneAt && shortDate(e.doneAt)].filter(Boolean).join(" · ")}`}
            </p>
          </div>
          <form action={toggleEvent.bind(null, e.id)}>
            <SubmitButton base="" pendingText="…" className="rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-bold text-save">
              {e.done ? "완료 취소" : "완료"}
            </SubmitButton>
          </form>
        </div>
        {e.hint && <p className="rounded-xl bg-spend-soft px-3 py-2 text-[13px] text-spend">{e.hint}</p>}
      </header>

      {/* 체크리스트 */}
      <section>
        <h2 className="section-title !justify-start">
          체크리스트
          <small className="num">
            {e.tasks.filter((t) => t.done).length}/{e.tasks.length}
          </small>
          <AddLink href={`${base}/tasks/new`}>+ 할 일</AddLink>
        </h2>
        <div className="card space-y-3">
          {e.tasks.length > 0 ? (
            <ul className="ledger">
              {e.tasks.map((t) => {
                const tDays = t.date ? daysUntil(t.date, now) : null;
                return (
                  <li key={t.id} className="flex items-start gap-2.5 py-2.5">
                    <div className="pt-0.5">
                      <OptimisticCheck done={t.done} action={toggleTask.bind(null, t.id)} label={t.content} />
                    </div>
                    <Link href={`/tasks/${t.id}/edit`} className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[14px] ${t.done ? "text-sub line-through" : ""}`}>
                          {t.section === ADMIN_SECTION && (
                            <span className="mr-1.5 rounded-md bg-save-soft px-1.5 py-0.5 text-[10px] font-bold text-save">행정</span>
                          )}
                          {t.content}
                        </span>
                        {(t.date || (t.done && t.doneBy)) && (
                          <span className="num block text-[12px] text-sub">
                            {t.date && (
                              <span className={!t.done && tDays! < 0 ? "font-semibold text-spend" : ""}>
                                {dateLabel(t.date, now)} · {dueLabel(tDays!)}
                              </span>
                            )}
                            {t.done && t.doneBy && `${t.date ? " · " : ""}${t.doneBy}`}
                          </span>
                        )}
                      </span>
                      <span className="pt-0.5 text-faint" aria-hidden>›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-sub">아직 할 일이 없어요</p>
          )}
          {suggestions.length > 0 && (
            <form action={addSuggestedTasks.bind(null, e.id)} className={e.tasks.length ? "border-t border-line pt-3" : ""}>
              <SubmitButton base="" pendingText="넣는 중…" className="text-left text-[13px] font-semibold text-save">
                추천 할 일 {suggestions.length}개 넣기 ({suggestions.slice(0, 2).map((x) => x.content).join(", ")}
                {suggestions.length > 2 ? " …" : ""})
              </SubmitButton>
            </form>
          )}
        </div>
      </section>

      {/* 메모 */}
      <section>
        <h2 className="section-title !justify-start">
          메모
          <AddLink href={`${base}/memo`}>{e.memo ? "메모 수정" : "메모 쓰기"}</AddLink>
        </h2>
        <div className="card">
          {e.memo ? (
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{e.memo}</p>
          ) : (
            <p className="text-[14px] text-sub">아직 메모가 없어요</p>
          )}
        </div>
      </section>

      {/* 돈 낼 날 */}
      <section>
        <h2 className="section-title !justify-start">
          돈 낼 날
          <small>계약금·잔금 날짜</small>
          <AddLink href={`${base}/payments/new`}>+ 추가</AddLink>
        </h2>
        <div className="card">
          {e.dues.length > 0 ? (
            <ul className="ledger">
              {e.dues.map((d) => {
                const dDays = daysUntil(d.date, now);
                return (
                  <li key={d.id} className="flex items-center gap-3">
                    <Link href={`/payments/${d.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                      <CategoryDot name={e.category} className="h-2.5 w-2.5 rotate-45 !rounded-[2px]" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[15px] font-semibold ${d.done ? "text-sub line-through" : ""}`}>{d.title}</span>
                        <span className="num block truncate text-[12px] text-sub">
                          {d.done ? (
                            `냈어요${d.doneBy ? ` · ${d.doneBy}` : ""}${d.doneAt ? ` · ${shortDate(d.doneAt)}` : ""}`
                          ) : (
                            <span className={dDays < 0 ? "font-semibold text-spend" : ""}>
                              {dateLabel(d.date, now)} · {dueLabel(dDays)}
                            </span>
                          )}
                          {d.memo && ` · ${d.memo}`}
                        </span>
                      </span>
                    </Link>
                    <form action={toggleDue.bind(null, d.id)}>
                      <SubmitButton
                        base="btn-ghost"
                        pendingText="…"
                        className={`!px-2.5 !py-1.5 text-[12px] ${d.done ? "!text-sub" : "!bg-save-soft !text-save"}`}
                      >
                        {d.done ? "취소" : "냈어요"}
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-sub">계약금·잔금처럼 놓치면 안 되는 날짜를 적어 두면 홈과 캘린더에 보여요</p>
          )}
        </div>
      </section>
    </main>
  );
}

/** 섹션 제목 오른쪽의 작성 화면 링크 */
function AddLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="ml-auto text-[13px] font-semibold text-save">
      {children}
    </Link>
  );
}

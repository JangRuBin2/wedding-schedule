import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateLabel, daysUntil, dueLabel, fullDate, shortDate, timeLabel } from "@/lib/dates";
import { colorOf, KINDS, soft } from "@/lib/meta";
import { won } from "@/lib/money";
import { getCategories } from "@/lib/categories";
import { ADMIN_SECTION, suggestionsFor } from "@/lib/templates";
import { CategoryDot } from "@/components/CategoryDot";
import { OptimisticCheck } from "@/components/OptimisticCheck";
import { SubmitButton } from "@/components/SubmitButton";
import { Tip } from "@/components/Tip";
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
      // 사진 내용(바이트)은 빼고 id 만. 이미지는 /api/photos 에서 따로 받음
      photos: { orderBy: { createdAt: "asc" }, select: { id: true } },
    },
  });
  if (!e) notFound();
  const color = colorOf(await getCategories(), e.category);

  const days = e.date ? daysUntil(e.date, now) : null;
  const suggestions = suggestionsFor(e.templateKey, e.tasks);
  const base = `/events/${e.id}`;
  const time = timeLabel(e.startTime, e.endTime);
  const paid = e.dues.filter((d) => d.done).reduce((n, d) => n + (d.amount ?? 0), 0);
  const planned = e.dues.filter((d) => !d.done).reduce((n, d) => n + (d.amount ?? 0), 0);

  return (
    <main className="space-y-7">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="캘린더로" className="-ml-1 p-1 text-[24px] leading-none text-ink">‹</Link>
          <Link href={`${base}/edit`} className="text-[13px] font-semibold text-save">수정</Link>
        </div>
        <div className="hero relative space-y-2.5 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: soft(color, 0.35) }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
              {e.category}
            </span>
            <form action={toggleEvent.bind(null, e.id)}>
              <SubmitButton
                base=""
                pendingText="…"
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${e.done ? "bg-card text-sub" : "bg-save text-on-save"}`}
              >
                {e.done ? "완료 취소" : "완료"}
              </SubmitButton>
            </form>
          </div>
          <h1 className="flex items-center gap-1.5 text-[22px] leading-tight font-bold">
            <span className={e.done ? "text-sub line-through decoration-2" : ""}>{e.title}</span>
            {e.hint && <Tip label="준비 팁 보기">{e.hint}</Tip>}
          </h1>
          <div className="space-y-1 text-[13px] text-sub">
            <p className="num">
              {e.date ? fullDate(e.date) : "날짜 미정"}
              {time && ` ${time}`}
              {e.date && !e.done && <b className="ml-1.5 font-semibold text-ink">{dueLabel(days!)}</b>}
            </p>
            {e.place && <p>⌖ {e.place}</p>}
            {e.done && <p>완료 {[e.doneBy, e.doneAt && shortDate(e.doneAt)].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
      </header>

      {/* 체크리스트 */}
      {/* 상세 내용 (메모) */}
      <section>
        <h2 className="section-title !justify-start">
          상세 내용
          <AddLink href={`${base}/memo`}>{e.memo ? "메모 수정" : "메모 작성"}</AddLink>
        </h2>
        <div className="rounded-[18px] bg-card/60 p-4 ring-1 ring-line">
          {e.memo ? (
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{e.memo}</p>
          ) : (
            <p className="text-[14px] text-sub">내용이 없어요</p>
          )}
        </div>
      </section>

      {/* 사진 */}
      <section>
        <h2 className="section-title !justify-start">
          사진
          {e.photos.length > 0 && <small className="num">{e.photos.length}장</small>}
          <AddLink href={`${base}/photos/new`}>+ 사진</AddLink>
        </h2>
        {e.photos.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {e.photos.map((p) => (
              <li key={p.id}>
                <Link href={`/photos/${p.id}`} className="block aspect-square overflow-hidden rounded-xl bg-card ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${p.id}?size=thumb`} alt="" loading="lazy" className="h-full w-full object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[18px] bg-card/60 p-4 text-[14px] text-sub ring-1 ring-line">사진이 없어요</p>
        )}
      </section>

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
              <SubmitButton base="" pendingText="추가 중…" className="text-left text-[13px] font-semibold text-save">
                추천 할 일 {suggestions.length}개 추가 ({suggestions.slice(0, 2).map((x) => x.content).join(", ")}
                {suggestions.length > 2 ? " …" : ""})
              </SubmitButton>
            </form>
          )}
        </div>
      </section>

      {/* 결제 */}
      <section>
        <h2 className="section-title !justify-start">
          결제
          {(paid > 0 || planned > 0) && (
            <small className="num">
              {paid > 0 && `${won(paid)} 결제`}
              {paid > 0 && planned > 0 && " · "}
              {planned > 0 && `${won(planned)} 예정`}
            </small>
          )}
          <AddLink href={`${base}/payments/new`}>+ 결제</AddLink>
        </h2>
        <div className="card">
          {e.dues.length > 0 ? (
            <ul className="ledger">
              {e.dues.map((d) => {
                const dDays = daysUntil(d.date, now);
                return (
                  <li key={d.id} className="flex items-center gap-3">
                    <Link href={`/payments/${d.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                      <CategoryDot color={KINDS.due.color} className="h-2.5 w-2.5 rotate-45 !rounded-[2px]" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[15px] font-semibold ${d.done ? "text-sub line-through" : ""}`}>{d.title}</span>
                        <span className="num block truncate text-[12px] text-sub">
                          {d.done ? (
                            `결제 완료${d.doneBy ? ` · ${d.doneBy}` : ""}${d.doneAt ? ` · ${shortDate(d.doneAt)}` : ""}`
                          ) : (
                            <span className={dDays < 0 ? "font-semibold text-spend" : ""}>
                              {dateLabel(d.date, now)} · {dueLabel(dDays)}
                            </span>
                          )}
                          {d.memo && ` · ${d.memo}`}
                        </span>
                      </span>
                      {d.amount != null && (
                        <span className={`num shrink-0 text-[14px] font-semibold ${d.done ? "text-sub" : ""}`}>{won(d.amount)}</span>
                      )}
                    </Link>
                    <form action={toggleDue.bind(null, d.id)}>
                      <SubmitButton
                        base="btn-ghost"
                        pendingText="…"
                        className={`!px-2.5 !py-1.5 text-[12px] ${d.done ? "!text-sub" : "!bg-save-soft !text-save"}`}
                      >
                        {d.done ? "취소" : "결제 완료"}
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-sub">결제 일정이 없어요</p>
          )}
        </div>
      </section>

      <Link href={`${base}/edit`} className="btn block w-full !py-3.5 text-center">
        수정하기
      </Link>
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

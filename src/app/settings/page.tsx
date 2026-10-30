import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { getWedding } from "@/lib/data";
import { dateLabel } from "@/lib/dates";
import { currentSession, getMe } from "@/lib/me";
import { kakaoEnabled } from "@/lib/session";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { SubmitButton } from "@/components/SubmitButton";
import { addTemplateEvents, setMe, setUserStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUS = { APPROVED: "승인됨", PENDING: "승인 대기", REJECTED: "거절됨" } as const;

export default async function SettingsPage() {
  const kakao = kakaoEnabled();
  const [wedding, me, session, templateCount, cats] = await Promise.all([
    getWedding(),
    getMe(),
    currentSession(),
    prisma.event.count({ where: { templateKey: { not: null } } }),
    getCategories(),
  ]);
  const users = kakao ? await prisma.user.findMany({ orderBy: { createdAt: "asc" } }) : [];
  const isOwner = users.some((u) => u.id === session?.uid && u.role === "OWNER");
  const missing = EVENT_TEMPLATES.length - templateCount;
  const names = wedding?.names ?? [];

  return (
    <main className="space-y-7">
      <h1 className="pt-2 text-[22px] font-bold">마이</h1>

      <section>
        <h2 className="section-title">우리 결혼식</h2>
        <ul className="card ledger !py-1">
          <Row href="/settings/wedding" label="결혼식 날짜·장소">
            {wedding?.date ? `${dateLabel(wedding.date)}${wedding.place ? ` · ${wedding.place}` : ""}` : "정하지 않음"}
          </Row>
          <Row href="/settings/names" label="우리 둘 이름">
            {names.length ? names.join(" · ") : "정하지 않음"}
          </Row>
          <Row href="/settings/categories" label="카테고리">
            {cats.map((c) => c.name).join(" · ")}
          </Row>
        </ul>
      </section>

      {!kakao && (
        <section>
          <h2 className="section-title">
            이 기기는 누구
            <small>체크한 사람으로 남아요</small>
          </h2>
          <form action={setMe} className="card flex flex-wrap items-center gap-2 !py-3.5">
            {names.map((n) => (
              <button
                key={n}
                name="name"
                value={n}
                aria-pressed={me === n}
                className={`btn-ghost ${me === n ? "!bg-save !text-on-save" : "!bg-paper"}`}
              >
                {n}
              </button>
            ))}
            {me && !names.includes(me) && <span className="btn-ghost !bg-save !text-on-save">{me}</span>}
            {me && (
              <button name="name" value="" className="ml-auto text-[12px] font-medium text-sub">
                선택 해제
              </button>
            )}
            {names.length === 0 && (
              <p className="text-[13px] text-sub">
                <Link href="/settings/names" className="font-semibold text-save">우리 둘 이름</Link>을 먼저 적어 주세요
              </p>
            )}
          </form>
        </section>
      )}

      {kakao && (
        <section>
          <h2 className="section-title">
            로그인
            <small>{session ? `${session.name}님으로 로그인함` : ""}</small>
          </h2>
          <ul className="card ledger !py-1">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {u.name}
                    {u.role === "OWNER" && <span className="ml-1.5 text-[11px] font-bold text-save">관리자</span>}
                  </span>
                  <span className="block text-[12px] text-sub">
                    {STATUS[u.status as keyof typeof STATUS] ?? u.status}
                    {u.nickname && u.nickname !== u.name && ` · 카카오 ${u.nickname}`}
                  </span>
                </span>
                {(u.id === session?.uid || isOwner) && (
                  <Link href={`/settings/account?id=${u.id}`} className="text-[13px] font-semibold text-save">
                    이름 수정
                  </Link>
                )}
                {isOwner && u.id !== session?.uid && u.status !== "APPROVED" && (
                  <form action={setUserStatus.bind(null, u.id, "APPROVED")}>
                    <SubmitButton base="btn-ghost" pendingText="…" className="!bg-save-soft !px-2.5 !py-1.5 text-[12px] !text-save">승인</SubmitButton>
                  </form>
                )}
                {isOwner && u.id !== session?.uid && u.status !== "REJECTED" && (
                  <form action={setUserStatus.bind(null, u.id, "REJECTED")}>
                    <SubmitButton base="btn-ghost" pendingText="…" className="!px-2.5 !py-1.5 text-[12px] !text-spend">
                      {u.status === "APPROVED" ? "막기" : "거절"}
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-[12px] text-sub">
            상대가 카카오로 로그인하면 여기에 승인 대기로 보여요 ·{" "}
            <a href="/api/auth/logout" className="font-semibold text-sub underline">로그아웃</a>
          </p>
        </section>
      )}

      {missing > 0 && (
        <section>
          <h2 className="section-title">기본 이벤트</h2>
          <form action={addTemplateEvents} className="card flex items-center justify-between gap-3 !py-3.5">
            <p className="text-[13px] leading-snug text-sub">양가 인사부터 신혼여행까지 기본 이벤트 중 없는 {missing}개를 넣어요</p>
            <SubmitButton pendingText="넣는 중…" className="shrink-0 whitespace-nowrap">넣기</SubmitButton>
          </form>
        </section>
      )}

      <section>
        <h2 className="section-title">앱처럼 쓰기</h2>
        <div className="card space-y-1.5 text-[13px] leading-relaxed text-sub">
          <p>
            <b className="text-ink">아이폰</b> Safari 공유 버튼 → 홈 화면에 추가
          </p>
          <p>
            <b className="text-ink">안드로이드</b> Chrome 메뉴(⋮) → 홈 화면에 추가
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3">
        <span className="shrink-0 text-[15px] font-semibold">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-[13px] text-sub">{children}</span>
        <span className="text-faint" aria-hidden>›</span>
      </Link>
    </li>
  );
}

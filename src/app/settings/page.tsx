import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { currentUser, getCouple, scoped } from "@/lib/tenant";
import { InviteLink } from "@/components/InviteLink";
import { getCategories } from "@/lib/categories";
import { getTheme, THEMES } from "@/lib/theme";
import { getWedding } from "@/lib/data";
import { dateLabel } from "@/lib/dates";
import { getMe } from "@/lib/me";
import { kakaoEnabled } from "@/lib/session";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { SubmitButton } from "@/components/SubmitButton";
import { Tip } from "@/components/Tip";
import { addTemplateEvents, removeMember, resetInvite, setMe } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await scoped();
  const kakao = kakaoEnabled();
  const [wedding, me, user, couple, templateCount, cats, theme] = await Promise.all([
    getWedding(),
    getMe(),
    currentUser(),
    getCouple(),
    db.event.count({ where: { templateKey: { not: null } } }),
    getCategories(),
    getTheme(),
  ]);
  // 우리 커플 멤버만
  const users = kakao && couple ? await prisma.user.findMany({ where: { coupleId: couple.id }, orderBy: { createdAt: "asc" } }) : [];
  const isOwner = user?.role === "OWNER";
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const missing = EVENT_TEMPLATES.length - templateCount;
  const names = wedding?.names ?? [];

  return (
    <main className="space-y-7">
      <h1 className="pt-2 text-[22px] font-bold">마이</h1>

      <section>
        <h2 className="section-title">우리 결혼식</h2>
        <ul className="card ledger !py-1">
          <Row href="/settings/wedding" label="결혼식 날짜·장소">
            {wedding?.date ? `${dateLabel(wedding.date)}${wedding.place ? ` · ${wedding.place}` : ""}` : "미설정"}
          </Row>
          <Row href="/settings/names" label="우리 둘 이름">
            {names.length ? names.join(" · ") : "미설정"}
          </Row>
          <Row href="/settings/categories" label="카테고리">
            {cats.map((c) => c.name).join(" · ")}
          </Row>
          <Row href="/settings/theme" label="화면 테마">
            {THEMES[theme]}
          </Row>
        </ul>
      </section>

      {!kakao && (
        <section>
          <h2 className="section-title">
            이 기기는 누구
            <Tip align="right">이 기기에서 체크하면 고른 이름이 완료 기록에 남아요</Tip>
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

      {kakao && couple && (
        <section>
          <h2 className="section-title">
            우리 커플
            <small>{user ? `${user.name}님으로 로그인` : ""}</small>
          </h2>
          <ul className="card ledger !py-1">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {u.name}
                    {u.role === "OWNER" && <span className="ml-1.5 text-[11px] font-bold text-save">만든 사람</span>}
                    {u.id === user?.id && <span className="ml-1.5 text-[11px] font-medium text-sub">나</span>}
                  </span>
                  {u.nickname && u.nickname !== u.name && <span className="block text-[12px] text-sub">카카오 {u.nickname}</span>}
                </span>
                {(u.id === user?.id || isOwner) && (
                  <Link href={`/settings/account?id=${u.id}`} className="text-[13px] font-semibold text-save">
                    이름 수정
                  </Link>
                )}
                {isOwner && u.id !== user?.id && (
                  <form action={removeMember.bind(null, u.id)}>
                    <SubmitButton base="btn-ghost" pendingText="…" className="!px-2.5 !py-1.5 text-[12px] !text-spend">
                      내보내기
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <div className="card mt-3 space-y-2 !py-3.5">
            <p className="flex items-center gap-1 text-[14px] font-semibold">
              초대 링크
              <Tip>이 링크를 받은 사람이 카카오로 로그인하면 우리 일정에 같이 들어와요. 4명까지</Tip>
            </p>
            <InviteLink url={`${origin}/join/${couple.inviteCode}`} />
            {isOwner && (
              <form action={resetInvite}>
                <SubmitButton base="" pendingText="바꾸는 중…" className="text-[12px] font-semibold text-sub">
                  링크 새로 만들기 (예전 링크는 막혀요)
                </SubmitButton>
              </form>
            )}
          </div>
          <p className="mt-2 flex gap-3 px-1 text-[12px] text-sub">
            <a href="/api/auth/logout" className="font-semibold underline">로그아웃</a>
            <Link href="/settings/leave" className="font-semibold underline">커플 나가기·계정 삭제</Link>
          </p>
        </section>
      )}

      {missing > 0 && (
        <section>
          <h2 className="section-title">기본 이벤트</h2>
          <form action={addTemplateEvents} className="card flex items-center justify-between gap-3 !py-3.5">
            <p className="text-[14px] font-semibold">빠진 기본 이벤트 {missing}개</p>
            <SubmitButton pendingText="추가 중…" className="shrink-0 whitespace-nowrap">다시 추가</SubmitButton>
          </form>
        </section>
      )}

      <section>
        <h2 className="section-title">앱</h2>
        <ul className="card ledger mb-3 !py-1">
          <Row href="/privacy" label="개인정보처리방침">{""}</Row>
          <Row href="/terms" label="이용약관">{""}</Row>
        </ul>
        <div className="card flex items-center gap-1.5 !py-3.5 text-[15px] font-semibold">
          홈 화면에 추가하는 방법
          <Tip>
            아이폰: Safari 공유 버튼 → 홈 화면에 추가
            <br />
            안드로이드: Chrome 메뉴(⋮) → 홈 화면에 추가
          </Tip>
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

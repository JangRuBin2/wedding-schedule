import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/dates";
import { kakaoEnabled } from "@/lib/session";
import { currentUser, LEGACY_COUPLE } from "@/lib/tenant";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { joinCouple } from "../../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "초대 링크가 맞지 않거나 바뀌었어요. 상대에게 새 링크를 받아 주세요",
  full: "이 커플은 이미 4명이 함께 쓰고 있어요",
  already: "이미 다른 커플에 들어가 있어요. 마이 → 커플 나가기 뒤에 다시 눌러 주세요",
};

/** 초대 링크로 들어온 화면. 로그인은 앞에서 끝남(proxy 가 로그인 뒤 이리로 돌려보냄) */
export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string | string[] }> }) {
  if (!kakaoEnabled()) redirect("/");
  const [{ code }, { error }] = await Promise.all([params, searchParams]);
  const me = await currentUser();
  if (!me) redirect(`/login?next=/join/${encodeURIComponent(code)}`);
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const couple = await prisma.couple.findUnique({ where: { inviteCode: c }, select: { id: true, names: true, date: true } });
  const found = couple && couple.id !== LEGACY_COUPLE;
  const msg = typeof error === "string" ? ERRORS[error] : me.coupleId === couple?.id ? null : me.coupleId ? ERRORS.already : !found ? ERRORS.invalid : null;
  if (found && me.coupleId === couple.id) redirect("/");

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">
      <Logo size={64} />
      {found ? (
        <div>
          <p className="text-[13px] text-sub">초대받았어요</p>
          <h1 className="mt-1 text-[22px] font-bold">{couple.names.length === 2 ? `${couple.names[0]} ♥ ${couple.names[1]}` : "같이 준비해요"}</h1>
          {couple.date && <p className="num mt-1 text-[14px] text-sub">{dateLabel(couple.date)} 결혼식</p>}
        </div>
      ) : (
        <h1 className="text-[20px] font-bold">초대 링크를 확인해 주세요</h1>
      )}
      {msg && <p className="max-w-xs text-[13px] font-semibold text-spend">{msg}</p>}
      <div className="w-full max-w-xs space-y-2">
        {found && !me.coupleId && (
          <form action={joinCouple.bind(null, c)}>
            <SubmitButton pendingText="들어가는 중…" className="w-full">
              같이 쓰기 시작
            </SubmitButton>
          </form>
        )}
        <Link href={me.coupleId ? "/settings/leave" : "/start"} className="block text-[13px] font-semibold text-sub">
          {me.coupleId ? "지금 커플에서 나가기" : "초대 없이 새로 시작하기"}
        </Link>
      </div>
    </main>
  );
}

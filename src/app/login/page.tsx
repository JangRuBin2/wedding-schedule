import { redirect } from "next/navigation";
import { kakaoEnabled, MISSING_SECRET } from "@/lib/session";
import { safeBack } from "@/lib/back";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Tip } from "@/components/Tip";

export const dynamic = "force-dynamic";

/** 로그인 실패 안내는 정해 둔 문구만 보여 줌 (주소에 아무 문구나 넣어 속이는 걸 막음) */
const KNOWN_ERRORS = new Set([
  MISSING_SECRET,
  "카카오 로그인을 취소했어요",
  "로그인 요청이 만료됐어요. 다시 시도해 주세요",
  "카카오 인증에 실패했어요. Redirect URI 설정을 확인해 주세요",
  "카카오 사용자 정보를 받지 못했어요",
  "이용이 제한된 계정이에요",
]);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; next?: string | string[] }> }) {
  if (!kakaoEnabled()) redirect("/");
  const { error: rawError, next } = await searchParams;
  const error = typeof rawError === "string" ? (KNOWN_ERRORS.has(rawError) ? rawError : "로그인하지 못했어요. 다시 시도해 주세요") : null;
  const back = safeBack(next, "");
  const invited = back.startsWith("/join/");
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo size={72} />
        <div>
          <h1 className="serif text-[36px] leading-tight">Our Wedding</h1>
          <p className="mt-1 text-[14px] text-sub">결혼 준비 일정, 둘이 같이</p>
        </div>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {/* 카카오 로그인 버튼 가이드: #FEE500 배경, 검정 85% 글씨, 말풍선 심볼 */}
        <a
          href={`/api/auth/kakao/login${back ? `?next=${encodeURIComponent(back)}` : ""}`}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#FEE500] py-3.5 text-[15px] font-semibold text-black/85"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.84 5.31 4.6 6.72l-.94 3.44c-.08.3.26.55.53.38l4.12-2.72c.55.07 1.11.11 1.69.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
          </svg>
          카카오 로그인
        </a>
        {error && <p className="text-[13px] font-semibold text-spend">{error}</p>}
        <p className="flex items-center justify-center gap-1 text-[12px] text-sub">
          {invited ? "로그인하면 초대받은 커플에 들어가요" : "로그인한 뒤 새로 시작하거나 초대 링크로 들어가요"}
          <Tip>둘 중 한 명이 먼저 시작하고, 마이 → 초대 링크를 상대에게 보내면 같은 일정을 같이 써요</Tip>
        </p>
        <p className="text-[11px] text-faint">
          로그인하면 <Link href="/terms" className="underline underline-offset-2">이용약관</Link>과{" "}
          <Link href="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>에 동의하는 것으로 봐요
        </p>
      </div>
    </main>
  );
}

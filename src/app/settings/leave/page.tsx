import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { kakaoEnabled } from "@/lib/session";
import { currentUser } from "@/lib/tenant";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { leaveCouple } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * 커플 나가기 · 계정 삭제 (플레이스토어·앱스토어 필수: 앱 안에서 계정 삭제).
 * 마지막 한 명이 나가면 커플 데이터(일정·결제·메모·사진·첨부)도 모두 지워짐을 미리 알림
 */
export default async function LeavePage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; delete?: string | string[] }> }) {
  if (!kakaoEnabled()) redirect("/settings");
  const me = await currentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const others = me.coupleId ? await prisma.user.count({ where: { coupleId: me.coupleId, id: { not: me.id } } }) : 0;
  const lastOne = !!me.coupleId && others === 0;

  return (
    <main className="space-y-6">
      <WriteHeader back="/settings" backLabel="취소" title="커플 나가기 · 계정 삭제" />
      <div className="card space-y-2 text-[14px] leading-relaxed">
        {me.coupleId ? (
          lastOne ? (
            <p className="font-semibold text-spend">
              지금 이 커플에 나 혼자예요. 나가면 일정·할 일·결제·메모·사진·첨부가 <u>모두 지워지고 되돌릴 수 없어요.</u>
            </p>
          ) : (
            <p>
              나가도 커플 데이터는 남은 {others}명이 계속 써요.{me.role === "OWNER" && " 초대 링크 관리는 남은 사람에게 넘어가요."}
            </p>
          )
        ) : (
          <p>지금 들어가 있는 커플이 없어요.</p>
        )}
        <p className="text-sub">계정 삭제를 고르면 카카오 연결 정보와 이름도 지워지고 로그아웃돼요. 다시 로그인하면 새 계정으로 시작해요.</p>
      </div>

      <form action={leaveCouple} className="card space-y-4">
        <label className="flex items-center gap-2 text-[14px] font-semibold">
          <input type="checkbox" name="deleteAccount" defaultChecked={sp.delete === "1" || !me.coupleId} className="h-4 w-4 accent-[var(--color-spend)]" />
          계정도 삭제하기
        </label>
        <label className="block space-y-1.5">
          <span className="label">확인을 위해 &lsquo;나가기&rsquo; 또는 &lsquo;계정 삭제&rsquo;를 그대로 적어 주세요</span>
          <input name="confirm" required autoComplete="off" placeholder="나가기 / 계정 삭제" className="input" />
        </label>
        {sp.error === "confirm" && <p className="text-[13px] font-semibold text-spend">적은 글자가 맞지 않아요 (계정 삭제를 골랐으면 &lsquo;계정 삭제&rsquo;)</p>}
        <SubmitButton base="btn" pendingText="처리 중…" className="w-full !bg-spend">
          진행하기
        </SubmitButton>
      </form>
    </main>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/tenant";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { renameUser } from "../../actions";

export const dynamic = "force-dynamic";

/** 카카오 로그인 사용자 이름 바꾸기. 체크한 사람으로 이 이름이 남아요 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  // 우리 커플 사람만 (본인 또는 만든 사람이 고침)
  const me = await currentUser();
  const user = typeof id === "string" && me?.coupleId ? await prisma.user.findFirst({ where: { id, coupleId: me.coupleId } }) : null;
  if (!user || (user.id !== me!.id && me!.role !== "OWNER")) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back="/settings" backLabel="취소" title="이름 수정" sub="완료 기록에 표시되는 이름이에요. 이전 기록은 바뀌지 않아요" />
      <form action={renameUser} className="card space-y-5">
        <input type="hidden" name="id" value={user.id} />
        <label className="block space-y-1">
          <span className="label">이름</span>
          <input name="name" defaultValue={user.name} required autoFocus maxLength={30} className="input" />
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}

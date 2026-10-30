import { getWedding } from "@/lib/data";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { saveNames } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NamesPage() {
  const names = (await getWedding())?.names ?? [];
  return (
    <main className="space-y-6">
      <WriteHeader back="/settings" backLabel="취소" title="우리 둘 이름" sub="홈 상단에 표시되고, 비밀번호로 잠글 때 이 기기를 쓰는 사람을 고르는 데 사용해요" />
      <form action={saveNames} className="card space-y-5">
        <label className="block space-y-1">
          <span className="label">한 사람</span>
          <input name="name1" defaultValue={names[0] ?? ""} placeholder="예: 민준" autoFocus maxLength={30} className="input" />
        </label>
        <label className="block space-y-1">
          <span className="label">다른 한 사람</span>
          <input name="name2" defaultValue={names[1] ?? ""} placeholder="예: 지은" maxLength={30} className="input" />
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}

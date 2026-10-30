import { setMe } from "@/app/actions";

/** 비밀번호로 잠글 때: 이 기기를 쓰는 사람을 한 번 고르면 체크한 사람으로 남음 */
export function MePicker({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <form action={setMe} className="card flex flex-wrap items-center gap-2 !py-3.5">
      <p className="w-full text-[13px] text-sub">누가 체크했는지 남기려면 이 기기를 쓰는 사람을 골라 주세요</p>
      {names.map((n) => (
        <button key={n} name="name" value={n} className="btn-ghost !bg-save-soft !text-save">
          {n}
        </button>
      ))}
    </form>
  );
}

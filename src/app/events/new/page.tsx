import { fromYmd } from "@/lib/dates";
import { EVENT_SUGGESTIONS, toCategory } from "@/lib/meta";
import { CategoryPicker } from "@/components/CategoryPicker";
import { DateField } from "@/components/DateField";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { createEvent } from "../../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ date?: string | string[]; category?: string | string[] }>;

/** 이벤트 만들기. 캘린더에서 날짜를 고르고 왔으면 ?date= 로 미리 채움 */
export default async function NewEventPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : "";
  return (
    <main className="space-y-6">
      <WriteHeader back={date ? "/" : "/events"} backLabel="취소" title="이벤트 만들기" sub="저장하면 이 이벤트 화면으로 가서 체크리스트와 메모를 이어서 채울 수 있어요" />
      <form action={createEvent} className="card space-y-5">
        <label className="block space-y-1">
          <span className="label">이름</span>
          <input name="title" placeholder="예: 드레스 투어" required autoFocus maxLength={100} list="event-suggestions" className="input" />
          <datalist id="event-suggestions">
            {EVENT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <CategoryPicker value={typeof sp.category === "string" ? toCategory(sp.category) : undefined} />
        <DateField defaultValue={date} undated={false} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}


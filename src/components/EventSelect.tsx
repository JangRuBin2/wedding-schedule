import Link from "next/link";
import { shortDate } from "@/lib/dates";

type Option = { id: string; title: string; category: string; date: Date | null; done: boolean };

/** 할 일·결제를 넣을 이벤트 고르기. 안 끝난 이벤트 먼저, 날짜 있으면 같이 보여 줌 */
export function EventSelect({ events }: { events: Option[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl bg-blush px-3 py-3 text-[13px] text-sub">
        할 일과 결제는 이벤트 안에 들어가요. 먼저{" "}
        <Link href="/events/new" className="font-semibold text-save underline underline-offset-2">
          이벤트를 만들어
        </Link>{" "}
        주세요
      </p>
    );
  }
  const sorted = [...events].sort((a, b) => Number(a.done) - Number(b.done));
  return (
    <label className="block space-y-1.5">
      <span className="label">어느 이벤트</span>
      <select name="eventId" required defaultValue="" className="input">
        <option value="" disabled>
          이벤트를 골라 주세요
        </option>
        {sorted.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title} · {e.category}
            {e.date ? ` · ${shortDate(e.date)}` : ""}
            {e.done ? " (완료)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

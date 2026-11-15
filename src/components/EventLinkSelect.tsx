import { shortDate } from "@/lib/dates";

type Option = { id: string; title: string; category: string; date: Date | null; done: boolean };

/** 지출을 묶을 이벤트 (선택). 안 묶어도 됨. 안 끝난 이벤트 먼저 */
export function EventLinkSelect({ events, value = "" }: { events: Option[]; value?: string }) {
  const sorted = [...events].sort((a, b) => Number(a.done) - Number(b.done));
  return (
    <label className="block space-y-1.5">
      <span className="label">이벤트 (선택)</span>
      <select name="eventId" defaultValue={value} className="input">
        <option value="">연결 안 함</option>
        {sorted.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
            {e.date ? ` · ${shortDate(e.date)}` : ""}
            {e.done ? " (완료)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

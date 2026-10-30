import Link from "next/link";
import { toggleDue, toggleEvent, toggleTask } from "@/app/actions";
import { dueLabel } from "@/lib/dates";
import type { ScheduleItem } from "@/lib/upcoming";
import { CategoryDot } from "./CategoryDot";
import { OptimisticCheck } from "./OptimisticCheck";

const KIND = { event: "이벤트", task: "할 일", due: "돈 낼 날" } as const;
const TOGGLE = { event: toggleEvent, task: toggleTask, due: toggleDue } as const;

/** 홈 '곧 할 일' 한 줄: 체크는 바로, 나머지를 누르면 그 이벤트로 */
export function ScheduleRow({ item }: { item: ScheduleItem & { days: number } }) {
  return (
    <li className="flex items-center gap-3">
      <OptimisticCheck done={item.done} action={TOGGLE[item.kind].bind(null, item.id)} label={item.title} />
      <Link href={`/events/${item.eventId}`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{item.title}</span>
          <span className="flex items-center gap-1.5 truncate text-[12px] text-sub">
            <CategoryDot name={item.category} className="h-1.5 w-1.5" />
            {KIND[item.kind]}
            {item.kind !== "event" && ` · ${item.eventTitle}`}
          </span>
        </span>
        <span className={`num shrink-0 text-[13px] font-bold ${item.days < 0 ? "text-spend" : item.days <= 7 ? "text-save" : "text-sub"}`}>
          {dueLabel(item.days)}
        </span>
      </Link>
    </li>
  );
}

import { daysUntil } from "./dates";

/** 홈 '곧 할 일'과 캘린더에 같이 쓰는 일정 한 줄 */
export type ScheduleItem = {
  kind: "event" | "task" | "due";
  id: string;
  title: string;
  /** 어느 이벤트의 것인지 (할 일·돈 낼 날) */
  eventId: string;
  eventTitle: string;
  category: string;
  date: Date;
  done: boolean;
};

type EventRow = {
  id: string;
  title: string;
  category: string;
  date: Date | null;
  done: boolean;
  tasks: { id: string; content: string; date: Date | null; done: boolean }[];
  dues: { id: string; title: string; date: Date; done: boolean }[];
};

/** 이벤트·할 일·돈 낼 날 중 날짜가 있는 것을 한 줄씩 */
export function scheduleItems(events: EventRow[]): ScheduleItem[] {
  return events.flatMap((e) => {
    const base = { eventId: e.id, eventTitle: e.title, category: e.category };
    return [
      ...(e.date ? [{ ...base, kind: "event" as const, id: e.id, title: e.title, date: e.date, done: e.done }] : []),
      ...e.tasks.filter((t) => t.date).map((t) => ({ ...base, kind: "task" as const, id: t.id, title: t.content, date: t.date!, done: t.done })),
      ...e.dues.map((d) => ({ ...base, kind: "due" as const, id: d.id, title: d.title, date: d.date, done: d.done })),
    ];
  });
}

/**
 * 곧 할 일: 안 끝난 것 중 밀린 것(지난 날짜) 먼저, 그다음 오늘부터 within일 안. 같은 날이면 이벤트 → 할 일 → 돈 낼 날
 */
export function upcoming(items: ScheduleItem[], now = new Date(), within = 30) {
  const order = { event: 0, task: 1, due: 2 } as const;
  return items
    .filter((i) => !i.done)
    .map((i) => ({ ...i, days: daysUntil(i.date, now) }))
    .filter((i) => i.days <= within)
    .sort((a, b) => a.days - b.days || order[a.kind] - order[b.kind]);
}

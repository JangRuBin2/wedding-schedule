"use client";
import { useState } from "react";

/** 시간 + '하루 종일'. 하루 종일을 켜면 시간 칸이 꺼지고, 시간을 고르면 하루 종일이 저절로 꺼짐 */
export function TimeFields({ start, end }: { start?: string | null; end?: string | null }) {
  const [allDay, setAllDay] = useState(!start);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">시간</span>
        <Toggle label="하루 종일" name="allDay" checked={allDay} onChange={setAllDay} />
      </div>
      <div className={`flex items-center gap-2 ${allDay ? "opacity-50" : ""}`}>
        <input
          name="startTime"
          type="time"
          defaultValue={start ?? ""}
          onChange={(e) => e.target.value && setAllDay(false)}
          aria-label="시작 시간"
          className="input num min-w-0 flex-1"
        />
        <span className="text-sub">-</span>
        <input
          name="endTime"
          type="time"
          defaultValue={end ?? ""}
          onChange={(e) => e.target.value && setAllDay(false)}
          aria-label="끝 시간"
          className="input num min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

/** 체크박스를 스위치 모양으로 */
export function Toggle({
  label,
  name,
  checked,
  defaultChecked,
  onChange,
}: {
  label: string;
  name: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-sub">
      {label}
      <span className="relative inline-flex">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-[22px] w-[38px] rounded-full bg-line transition-colors peer-checked:bg-save peer-focus-visible:outline-2 peer-focus-visible:outline-save" />
        <span className="absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-card shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

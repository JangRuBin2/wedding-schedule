"use client";
import { useState, type ReactNode } from "react";
import { KINDS, type Kind } from "@/lib/meta";

/**
 * 작성 화면 맨 위의 종류 고르기(이벤트·할 일·결제). 고른 종류의 칸만 보이고,
 * 나머지 칸은 fieldset disabled 라 저장할 때 같이 보내지지도, 필수 검사에 걸리지도 않음
 */
export function KindSwitch({ initial, sections }: { initial: Kind; sections: Record<Kind, ReactNode> }) {
  const [kind, setKind] = useState<Kind>(initial);
  return (
    <>
      <fieldset className="space-y-1.5">
        <legend className="label mb-1.5">종류</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(KINDS) as Kind[]).map((k) => {
            const on = kind === k;
            return (
              <label
                key={k}
                className="relative cursor-pointer rounded-xl border py-2.5 text-center text-[14px] font-bold"
                style={{
                  borderColor: KINDS[k].color,
                  color: on ? "#fff" : KINDS[k].color,
                  background: on ? KINDS[k].color : "transparent",
                }}
              >
                <input type="radio" name="kind" value={k} checked={on} onChange={() => setKind(k)} className="sr-only" />
                {KINDS[k].label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {(Object.keys(sections) as Kind[]).map((k) => (
        <fieldset key={k} disabled={kind !== k} hidden={kind !== k} className="space-y-5">
          {sections[k]}
        </fieldset>
      ))}
    </>
  );
}

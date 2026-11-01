"use client";
import { useState } from "react";

/**
 * 추천어가 있는 입력 칸. 예전엔 <datalist> 를 썼는데, 안드로이드 크롬에서 칸에 포커스만 가도
 * 브라우저 기본 목록이 화면 절반을 덮고(다크 모드에서도 흰 테두리·회색 줄) 칸 오른쪽에 ▼ 화살표가 붙어서
 * 앱 스타일이 깨졌음. 그래서 칸 아래에 칩으로 보여 주고, 누르면 칸에 채워 넣음
 */
export function SuggestInput({
  name,
  id,
  suggestions,
  defaultValue = "",
  placeholder,
  maxLength,
  required,
}: {
  name: string;
  id?: string;
  suggestions: readonly string[];
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const q = value.trim();
  // 적고 있는 글자가 들어간 추천을 앞으로. 똑같이 적었으면 숨김
  const list = q
    ? [...suggestions.filter((s) => s.includes(q)), ...suggestions.filter((s) => !s.includes(q))].filter((s) => s !== q)
    : suggestions;
  return (
    <>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        className="input"
      />
      {list.length > 0 && (
        // 한 줄로 옆으로 밀어 보기. 화면 끝까지 닿게 카드 안쪽 여백만큼 바깥으로 빼고 다시 채움
        <div className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map((s) => (
            <button
              key={s}
              type="button"
              // 누르면 채우기만 하고 포커스는 안 줌 (폰에서 키보드가 올라와 아래 칸을 가리지 않게)
              onClick={() => setValue(s)}
              className="chip shrink-0 !py-1.5 !text-[12px]"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

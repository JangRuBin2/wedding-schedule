"use client";
import { useRouter } from "next/navigation";

/** 카테고리 필터 (선택 상자). 고르면 주소(?cat=)가 바뀌어 새로고침해도 유지. base = 그 화면 주소 */
export function CategoryFilter({ options, value, base = "/events" }: { options: { name: string; count: number }[]; value: string; base?: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center">
      <span className="sr-only">카테고리</span>
      <select
        value={value}
        onChange={(e) => router.push(e.target.value ? `${base}?cat=${encodeURIComponent(e.target.value)}` : base)}
        className="select"
      >
        <option value="">카테고리 전체 ({options.reduce((n, o) => n + o.count, 0)})</option>
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {o.name} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

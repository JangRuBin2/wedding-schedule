"use client";
import { useRouter } from "next/navigation";

/** 리스트 카테고리 필터 (선택 상자). 고르면 주소(?cat=)가 바뀌어 새로고침해도 유지 */
export function CategoryFilter({ options, value }: { options: { name: string; count: number }[]; value: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center">
      <span className="sr-only">카테고리</span>
      <select
        value={value}
        onChange={(e) => router.push(e.target.value ? `/events?cat=${encodeURIComponent(e.target.value)}` : "/events")}
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

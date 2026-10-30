import { getTheme, THEMES, type Theme } from "@/lib/theme";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { saveTheme } from "../../actions";

export const dynamic = "force-dynamic";

const SWATCH: Record<Theme, string> = {
  system: "linear-gradient(135deg, #f7f4f1 50%, #1a1718 50%)",
  light: "#f7f4f1",
  dark: "#1a1718",
};

/** 화면 테마 고르기 (작성 화면). 이 기기에만 적용 */
export default async function ThemePage() {
  const theme = await getTheme();
  return (
    <main className="space-y-6">
      <WriteHeader back="/settings" backLabel="취소" title="화면 테마" sub="이 기기에만 적용돼요" />
      <form action={saveTheme} className="card space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">테마</legend>
          {(Object.keys(THEMES) as Theme[]).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-save has-[:checked]:bg-blush">
              <input type="radio" name="theme" value={t} defaultChecked={t === theme} className="h-4 w-4 accent-[var(--color-save)]" />
              <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-line" style={{ background: SWATCH[t] }} aria-hidden />
              <span className="text-[15px] font-semibold">{THEMES[t]}</span>
            </label>
          ))}
        </fieldset>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}

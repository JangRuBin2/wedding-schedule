import { cookies } from "next/headers";

/** 화면 테마 (기기마다 쿠키). system = 기기 설정을 따라감 */
export const THEME_COOKIE = "bomnal_theme";
export const THEMES = { system: "시스템 설정", light: "라이트", dark: "다크" } as const;
export type Theme = keyof typeof THEMES;

export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}

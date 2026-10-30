import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "봄날",
  description: "결혼 준비 일정, 둘이 같이",
  appleWebApp: { title: "봄날", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

const LIGHT = "#f7f4f1";
const DARK = "#1a1718";

/** 휴대폰 상단 막대 색도 고른 테마에 맞춤 */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: LIGHT },
            { media: "(prefers-color-scheme: dark)", color: DARK },
          ]
        : theme === "dark"
          ? DARK
          : LIGHT,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    // 고른 테마는 서버에서 바로 붙여서 처음 그릴 때부터 맞는 색 (깜빡임 없음)
    <html lang="ko" data-theme={theme === "system" ? undefined : theme}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap" />
      </head>
      <body className="min-h-dvh">
        <Nav />
        <div className="mx-auto max-w-xl px-4 pt-5 pb-32 md:pt-6 md:pb-12">{children}</div>
      </body>
    </html>
  );
}

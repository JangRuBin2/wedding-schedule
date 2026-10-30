import type { MetadataRoute } from "next";

/** 홈 화면에 추가하면 앱처럼 열림 (안드로이드·아이폰 둘 다) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "봄날",
    short_name: "봄날",
    description: "결혼 준비 일정, 둘이 같이",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4fb",
    theme_color: "#8e9bff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

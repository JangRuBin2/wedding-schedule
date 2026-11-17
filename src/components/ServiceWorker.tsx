"use client";
import { useEffect } from "react";

/** 서비스 워커 등록 (인터넷이 끊기면 '연결 없음' 화면). 개발 중엔 등록 안 함 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

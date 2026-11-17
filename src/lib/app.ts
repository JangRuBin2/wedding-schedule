import { cookies } from "next/headers";

/** 플레이스토어 앱(TWA) 안에서 열렸는지 (src/proxy.ts 가 ?app=twa 를 보고 쿠키를 남김) */
export async function inStoreApp() {
  return (await cookies()).get("bomnal_app")?.value === "twa";
}

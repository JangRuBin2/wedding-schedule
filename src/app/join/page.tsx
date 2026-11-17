import { redirect } from "next/navigation";

/** 시작하기 화면의 '초대 코드' 입력 → /join/코드 */
export default async function JoinCodePage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  const c = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "";
  redirect(c ? `/join/${c}` : "/start");
}

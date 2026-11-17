import { redirect } from "next/navigation";

/** (옛 승인 대기 화면) 이제 승인 없이 시작하기·초대 링크로 들어옴 */
export default function PendingPage() {
  redirect("/start");
}

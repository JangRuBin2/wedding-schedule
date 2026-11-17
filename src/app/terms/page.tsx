import Link from "next/link";
import { OPERATOR, orPending } from "@/lib/operator";

export const metadata = { title: "이용약관 · 봄날" };

/** 이용약관 (로그인 없이 열림) */
export default function TermsPage() {
  const items: [string, string][] = [
    ["목적", "이 약관은 봄날(결혼 준비 일정을 커플이 같이 관리하는 서비스) 이용에 필요한 기본 사항을 정해요."],
    ["가입", "카카오 계정으로 로그인하면 가입돼요. 만 14세 이상만 쓸 수 있어요."],
    ["커플과 초대", "한 커플은 4명까지 같이 쓸 수 있어요. 초대 링크를 받은 사람은 그 커플의 모든 일정·결제·메모·사진·첨부를 보고 고칠 수 있으니 믿을 수 있는 사람에게만 보내 주세요."],
    ["이용자가 올린 내용", "올린 글·사진·파일의 권리와 책임은 올린 사람에게 있어요. 다른 사람의 권리를 침해하거나 법에 어긋나는 내용은 올리면 안 돼요."],
    ["서비스 변경과 중단", "기능은 바뀌거나 멈출 수 있어요. 큰 변경이나 서비스 종료는 미리 앱 안에서 알려요."],
    ["요금", "지금은 무료예요. 유료 기능이 생기면 가격과 환불 규정을 따로 알리고 동의를 받아요."],
    ["책임의 한계", "결제일·금액 같은 정보는 이용자가 직접 적은 것이라, 실제 계약·결제 내용은 업체와 꼭 확인해 주세요. 천재지변이나 외부 서비스 장애처럼 운영자가 막을 수 없는 일로 생긴 손해는 책임지기 어려워요."],
    ["탈퇴", "마이 → 커플 나가기·계정 삭제에서 언제든 탈퇴할 수 있어요."],
  ];
  return (
    <main className="space-y-5 pb-10 text-[14px] leading-relaxed">
      <header className="space-y-1 pt-2">
        <Link href="/" className="text-[13px] font-semibold text-sub">‹ 봄날</Link>
        <h1 className="text-[22px] font-bold">이용약관</h1>
        <p className="text-[12px] text-sub">시행일 {OPERATOR.effective}</p>
      </header>
      <ol className="card space-y-4">
        {items.map(([t, body], i) => (
          <li key={t} className="space-y-1">
            <h2 className="text-[15px] font-bold">
              제{i + 1}조 {t}
            </h2>
            <p className="text-ink/90">{body}</p>
          </li>
        ))}
        <li className="space-y-1">
          <h2 className="text-[15px] font-bold">문의</h2>
          <p className="text-ink/90">
            {orPending(OPERATOR.name)} · {orPending(OPERATOR.email)}
          </p>
        </li>
      </ol>
    </main>
  );
}

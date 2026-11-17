import Link from "next/link";
import { OPERATOR, orPending } from "@/lib/operator";

export const metadata = { title: "개인정보처리방침 · 봄날" };

/** 개인정보처리방침 (로그인 없이 열림 — 플레이스토어 등록 주소) */
export default function PrivacyPage() {
  return (
    <main className="space-y-5 pb-10 text-[14px] leading-relaxed">
      <header className="space-y-1 pt-2">
        <Link href="/" className="text-[13px] font-semibold text-sub">‹ 봄날</Link>
        <h1 className="text-[22px] font-bold">개인정보처리방침</h1>
        <p className="text-[12px] text-sub">시행일 {OPERATOR.effective}</p>
      </header>
      <div className="card space-y-5">
        <Sec title="1. 모으는 정보">
          <ul className="list-disc space-y-1 pl-5">
            <li>카카오 로그인: 카카오 회원번호, 닉네임 (이메일·전화번호는 받지 않아요)</li>
            <li>직접 적은 내용: 결혼식 날짜·장소·이름, 일정·할 일, 결제·지출 금액과 메모, 메모(글·손그림), 올린 사진과 첨부 파일</li>
            <li>자동으로 남는 것: 로그인 유지용 쿠키, 마지막 로그인 시각, 앱을 쓴 날 수(후원 안내를 자주 쓰는 분에게만 띄우려고), 서버 접속 기록(IP·브라우저 정보, 보안·오류 확인용)</li>
            <li>후원(커피 한 잔)은 카카오페이 같은 외부 송금 서비스에서 이뤄져서, 봄날은 결제·계좌 정보를 받지 않아요</li>
          </ul>
        </Sec>
        <Sec title="2. 쓰는 목적">
          로그인과 본인 확인, 커플끼리 일정·결제·메모를 같이 보고 고치게 하는 것, 서비스 오류 확인과 보안. 광고나 판매에는 쓰지 않아요.
        </Sec>
        <Sec title="3. 보관 기간과 삭제">
          <ul className="list-disc space-y-1 pl-5">
            <li>계정 정보: 계정을 삭제할 때까지. 마이 → 커플 나가기·계정 삭제에서 바로 지울 수 있어요</li>
            <li>커플 데이터(일정·결제·메모·사진·첨부): 커플의 마지막 사람이 나가면 바로 지워요</li>
            <li>서버 접속 기록: 보안 목적으로 최대 90일</li>
            <li>법에서 보관하라고 정한 정보가 생기면 그 기간 동안만 따로 보관해요</li>
          </ul>
        </Sec>
        <Sec title="4. 다른 곳에 맡기는 일 (처리 위탁·국외 이전)">
          서비스를 돌리기 위해 아래 회사에 저장·처리를 맡겨요. 서버가 해외에 있어서 정보가 국외로 옮겨져요.
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Vercel Inc. (미국) — 웹 서버 운영, 사진·첨부 파일 저장 (서버 위치: 일본 도쿄 등)</li>
            <li>Neon Inc. (미국) — 데이터베이스 저장</li>
            <li>카카오 — 로그인 (카카오 계정 확인)</li>
          </ul>
          옮기는 때: 서비스를 쓸 때마다 네트워크로. 옮기는 정보: 위 1번 정보. 보관 기간: 위 3번과 같음. 원하지 않으면 계정을 삭제하면 돼요.
        </Sec>
        <Sec title="5. 다른 사람에게 주는 경우">
          같은 커플에 초대한 사람에게만 커플 데이터가 보여요. 법에 따른 요청이 있을 때 말고는 다른 사람에게 주지 않아요.
        </Sec>
        <Sec title="6. 이용자의 권리">
          언제든 내 정보를 보고, 고치고, 지울 수 있어요 (앱 안에서 직접, 또는 아래 연락처로). 만 14세 미만은 가입할 수 없어요.
        </Sec>
        <Sec title="7. 안전하게 지키는 방법">
          모든 통신은 HTTPS 로 암호화하고, 사진·첨부는 비공개 저장소에 두어 로그인한 커플만 볼 수 있어요. 로그인 쿠키는 서명해서 위조할 수 없게 해요.
        </Sec>
        <Sec title="8. 개인정보 보호책임자·문의">
          {orPending(OPERATOR.name)} · {orPending(OPERATOR.email)}
          <br />
          개인정보 침해 신고: 개인정보침해신고센터 (privacy.kisa.or.kr, 국번 없이 118)
        </Sec>
      </div>
    </main>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <div className="text-ink/90">{children}</div>
    </section>
  );
}

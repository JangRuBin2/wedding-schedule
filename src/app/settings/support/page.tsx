import { redirect } from "next/navigation";
import { WriteHeader } from "@/components/WriteHeader";
import { supportMenuUrl } from "@/lib/support-server";

export const dynamic = "force-dynamic";

/** 개발자에게 커피 한 잔 (언제든 여기서). 후원 주소가 없거나 플레이스토어 앱 안이면 마이로 */
export default async function SupportPage() {
  const url = await supportMenuUrl();
  if (!url) redirect("/settings");
  return (
    <main className="space-y-6">
      <WriteHeader back="/settings" backLabel="마이" title="개발자에게 커피 한 잔" />
      <section className="hero space-y-3 p-6 text-center">
        <div className="text-[48px] leading-none" aria-hidden>
          ☕
        </div>
        <p className="text-[15px] leading-relaxed">
          봄날은 결혼을 준비하던 개발자가
          <br />
          우리 둘이 쓰려고 만들다 함께 쓰게 된 앱이에요.
        </p>
        <p className="text-[14px] leading-relaxed text-sub">
          광고 없이 계속 무료로 두고 싶어요.
          <br />
          커피 한 잔 값(3,000원 정도)이면 한 달 서버비에 큰 힘이 돼요.
        </p>
      </section>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn block w-full !py-3.5 text-center">
        ☕ 커피 한 잔 보내기
      </a>
      <p className="px-1 text-center text-[12px] text-faint">
        카카오페이 송금으로 연결돼요. 후원해도 기능은 똑같고, 안 해도 모든 기능을 쓸 수 있어요.
      </p>
    </main>
  );
}

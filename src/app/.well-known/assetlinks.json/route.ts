import { ANDROID } from "@/lib/android";

/** 안드로이드 앱(TWA)이 이 사이트의 앱임을 확인하는 파일 (Digital Asset Links). 로그인 없이 열려야 함 */
export function GET() {
  const body = ANDROID.sha256.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: ANDROID.packageId, sha256_cert_fingerprints: ANDROID.sha256 },
        },
      ]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}

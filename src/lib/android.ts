/**
 * 플레이스토어 앱(TWA) 설정. 앱은 이 사이트를 주소창 없이 띄우는 안드로이드 껍데기라, 사이트가
 * /.well-known/assetlinks.json 으로 "이 앱은 우리 앱이 맞다"고 알려 줘야 주소창이 사라짐.
 *
 * - packageId: 플레이스토어 패키지 이름. 첫 업로드 뒤에는 못 바꿈 (android/twa-manifest.json 과 같아야 함)
 * - sha256: 앱 서명 인증서 지문. 업로드 키 지문 + Play Console → 앱 무결성 → 앱 서명 키 지문 둘 다 넣기
 */
export const ANDROID = {
  packageId: "com.bomnal.app",
  sha256: [] as string[],
};

import "dotenv/config";
import { moveAllToBlob } from "../src/lib/photos";

/**
 * 배포할 때(vercel.json buildCommand) DB 에 남은 사진을 Vercel Blob 으로 옮김.
 * Blob 을 아직 연결하지 않았거나 옮기다 실패해도 배포는 막지 않음 (못 옮긴 사진은 처음 볼 때 다시 시도)
 */
moveAllToBlob()
  .then((r) => console.log(r.skipped ? "사진 옮기기: Blob 미연결이라 건너뜀" : `사진 옮기기: ${r.moved}장 옮김, ${r.failed}장 실패`))
  .catch((e) => console.error("사진 옮기기 실패 (배포는 계속)", e))
  .finally(() => process.exit(0));

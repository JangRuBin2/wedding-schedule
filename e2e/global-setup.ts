import { execFileSync } from "node:child_process";
import { assertSafeDatabase, DATABASE_URL } from "./env";

/**
 * 테스트 DB 를 지금 스키마로 맞춤 (전용 DB 인지 먼저 확인). 데이터는 지우지 않는다 —
 * 테스트마다 자기 커플·사용자를 새로 만들어 쓰므로 남은 데이터가 결과에 영향을 주지 않음.
 * 스키마를 크게 바꿔 맞춰지지 않으면 테스트 DB 를 직접 지우고(dropdb bomnal_e2e && createdb bomnal_e2e) 다시 돌린다
 */
export default function globalSetup() {
  assertSafeDatabase();
  // prisma.config.ts 는 UNPOOLED 가 있으면 그걸 쓰므로 빼서 테스트 DB 로만 가게
  const { DATABASE_URL_UNPOOLED: _, ...env } = process.env;
  const run = (args: string[]) => execFileSync("npx", ["prisma", ...args], { env: { ...env, DATABASE_URL }, stdio: "pipe" });
  // 운영 배포와 같은 순서 (scripts/vercel-build.sh): 경고로 멈추는 변경을 먼저 → db push
  // 빈 DB(CI 처음 실행)면 고칠 테이블이 없어 P1014 로 실패함 → 그땐 건너뛰고 db push 가 새로 만듦
  try {
    run(["db", "execute", "--file", "prisma/pre-push.sql"]);
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? "") + String((e as { stderr?: Buffer }).stderr ?? "");
    if (!out.includes("P1014")) throw e;
  }
  run(["db", "push"]);
}

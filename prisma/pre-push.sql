-- 배포 빌드에서 `prisma db push` 바로 전에 실행 (vercel.json). 여러 번 돌려도 같은 결과.
-- db push 가 '데이터 손실 가능' 경고로 멈추는 변경을 미리 해 둠 (실제 손실은 없는 것만):
--   카테고리 이름 유일 → 커플별 유일. 지금 이름은 이미 서로 달라서 새 유일 조건에 걸릴 일이 없음
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "coupleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Category_coupleId_name_key" ON "Category"("coupleId", "name");

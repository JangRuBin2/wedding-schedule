#!/usr/bin/env bash
# Vercel 빌드 (vercel.json buildCommand). 운영 배포에서만 DB 를 바꿈 — 미리보기(브랜치) 빌드는 DB 를 건드리지 않음.
# 순서: 클라이언트 생성 → (운영) DB 구조 맞추기 → 데이터 옮기기 → 앱 빌드
set -euo pipefail
prisma generate
if [ "${VERCEL_ENV:-}" = "production" ]; then
  # db push 가 '데이터 손실 가능' 경고로 멈추는 변경을 먼저 (실제 손실 없는 것만)
  prisma db execute --file prisma/pre-push.sql
  prisma db push
  tsx scripts/migrate-couples.ts
  tsx scripts/merge-dues.ts
  tsx scripts/group-expenses.ts
  tsx scripts/move-photos-to-blob.ts
else
  echo "preview build: DB 는 건드리지 않음"
fi
next build

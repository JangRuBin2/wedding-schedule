# 봄날 (가칭)

결혼 준비 **일정**을 둘이 같이 관리하는 웹 서비스예요. 모아봄(wedding-fund)의 결혼준비 탭에서 일정 기능만 떼어 냈고, 공용 자산 관리(가계부)는 넣지 않았어요.
네이티브 앱 없이 **웹으로만** 만들어요. 휴대폰에서는 홈 화면에 추가해서 앱처럼 써요(PWA).

기획 문서: [docs/planning.md](docs/planning.md)

## 지금 되는 것

- **시작하기**: 결혼식 날짜와 우리 둘 이름을 넣으면 20개 기본 이벤트를 만들고 추천 일정을 채워요
- **홈**: Our Wedding 머리말(D-day), 큰 칸 캘린더(종류별 색 막대: 이벤트·할 일·결제), 카테고리 선택 상자. 날짜를 누르면 바로 아래에 그날 일정과 `+ 추가`(그 날짜로 작성 화면을 엶. 이벤트·할 일·결제는 작성 화면에서 고름), 바로 체크. 아래에 그 달 일정
- **리스트**: 전체 이벤트, 카테고리 선택 상자, 완료 체크. `선택`으로 여러 개 골라 한 번에 완료·삭제
- **예산**: 카테고리별 예산, 낸 돈·낼 돈·남은 돈, 카테고리 막대, 낼 돈 목록('냈어요'), 최근 낸 돈. 돈은 이벤트의 '결제' 금액에서 쌓여요
- **이벤트**: 카테고리, 날짜, 시간(하루 종일), 장소, 상세 내용(메모), 사진(브라우저에서 줄여 Vercel Blob에 비공개로 저장), 체크리스트(추천 할 일), 결제(금액·날짜·냈어요)
- **카테고리**: 기본 6개(예식·스드메·예물·예단·신혼여행·신혼집·기타)에 직접 추가, 이름·색 바꾸기, 삭제(그 이벤트는 '기타'로)
- **보기·작성 분리**: 보기 화면에는 입력 칸이 없고, `+`·`수정`을 누르면 작성 화면으로 가요. 저장하면 보던 화면으로 돌아오고, 삭제는 수정 화면 맨 아래에만 있어요
- **같이 쓰기**: 카카오 로그인(처음 들어온 사람이 관리자, 상대는 승인) 또는 비밀번호 하나 + '이 기기는 누구'. 누가 체크했는지 남아요

2차(웹 푸시, 모아봄에서 가져오기, 캘린더 내보내기)는 기획 문서 9장을 봐 주세요.

## 기술

- Next.js 16 (App Router, 서버 액션) + Prisma 7 + Postgres(Neon)
- Tailwind CSS 4, Vercel 배포(도쿄 리전 `hnd1`)
- 모아봄과 DB를 나눠 써요

## 로컬에서 실행

```bash
npm install
cp .env.example .env   # DATABASE_URL 채우기
npx prisma db push
npm run dev
```

검사:

```bash
npm run typecheck
npm test
```

## 배포 (Vercel)

1. Vercel에서 이 저장소를 가져오기(Import)
2. Storage → Neon Postgres 연결 (`DATABASE_URL` 이 자동으로 들어가요)
3. 환경 변수
   - 비밀번호로 잠글 때: `APP_PASSWORD`
   - 카카오 로그인으로 잠글 때: `KAKAO_REST_API_KEY`, `AUTH_SECRET`(긴 랜덤 문자열), 필요하면 `KAKAO_CLIENT_SECRET`
     - 카카오 개발자 콘솔의 Redirect URI에 `https://<배포 주소>/api/auth/kakao/callback` 추가
4. 사진 저장소: Storage → Create → **Blob**, 접근을 **Private**으로 만들고 이 프로젝트에 연결 (`BLOB_READ_WRITE_TOKEN` 이 자동으로 들어가요)
   - 연결하기 전에는 사진을 DB에 저장해요. 연결한 뒤 배포하면 DB에 있던 사진을 Blob으로 옮기고, 그때 못 옮긴 사진은 처음 볼 때 옮겨요
   - Blob은 비공개라 파일 주소만으로는 열리지 않고, 화면은 `/api/photos/[id]` 로 앱 잠금 안에서만 보여요
5. 배포하면 빌드할 때 `prisma db push` 로 테이블이 만들어지고, `scripts/move-photos-to-blob.ts` 가 남은 사진을 옮겨요

## 폴더

```
src/app/            화면 (보기: /, /events, /events/[id], /budget, /settings · 작성: /new(추가), */new, */edit, */memo)
src/app/actions.ts  저장(서버 액션)
src/lib/templates.ts  기본 20개 이벤트·추천 일정·추천 할 일
src/lib/upcoming.ts   곧 할 일·캘린더 일정 계산
src/lib/dates.ts      한국 시간 기준 날짜·시간 표시
src/lib/budget.ts     예산 합계·막대
src/lib/money.ts      금액 입력·표시
src/lib/photos.ts     사진 저장소 (Vercel Blob 비공개, 연결 전엔 DB)
prisma/schema.prisma  Wedding · Category · Event · Task · Due · Photo · User
```

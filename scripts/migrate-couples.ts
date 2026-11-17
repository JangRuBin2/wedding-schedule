import "dotenv/config";
import { prisma } from "../src/lib/db";
import { LEGACY_COUPLE } from "../src/lib/tenant";

/**
 * 배포할 때(vercel.json, 운영만) 한 커플용 데이터 → 여러 커플용으로 한 번 옮김. 여러 번 돌려도 같은 결과.
 * - 옛 결혼식 정보(Wedding 한 줄)가 있으면 첫 커플(LEGACY_COUPLE)로 만들고, 그때 승인돼 있던 카카오 사용자들을 이 커플에 넣음
 *   (끝나면 Wedding 줄을 지워서, 다음 배포 때 새로 가입한 사람이 여기 섞이지 않게)
 * - 커플이 비어 있는 카테고리·이벤트·결제·메모는 첫 커플로
 * - 옛 '승인 대기' 사용자는 승인 단계가 없어졌으니 그냥 가입한 상태로 (자기 커플을 새로 시작하거나 초대받아 들어감)
 */
function code() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => abc[b % abc.length]).join("");
}

async function main() {
  const wedding = await prisma.wedding.findUnique({ where: { id: 1 } });
  const orphans =
    (await prisma.category.count({ where: { coupleId: null } })) +
    (await prisma.event.count({ where: { coupleId: null } })) +
    (await prisma.expense.count({ where: { coupleId: null } })) +
    (await prisma.note.count({ where: { coupleId: null } }));
  if (!wedding && !orphans) return console.log("커플 옮기기: 옮길 것 없음");

  await prisma.couple.upsert({
    where: { id: LEGACY_COUPLE },
    create: { id: LEGACY_COUPLE, date: wedding?.date ?? null, place: wedding?.place ?? null, names: wedding?.names ?? [], inviteCode: code() },
    update: {},
  });
  const [c, e, x, n] = await prisma.$transaction([
    prisma.category.updateMany({ where: { coupleId: null }, data: { coupleId: LEGACY_COUPLE } }),
    prisma.event.updateMany({ where: { coupleId: null }, data: { coupleId: LEGACY_COUPLE } }),
    prisma.expense.updateMany({ where: { coupleId: null }, data: { coupleId: LEGACY_COUPLE } }),
    prisma.note.updateMany({ where: { coupleId: null }, data: { coupleId: LEGACY_COUPLE } }),
  ]);
  let joined = 0;
  if (wedding) {
    joined = (await prisma.user.updateMany({ where: { status: "APPROVED", coupleId: null }, data: { coupleId: LEGACY_COUPLE } })).count;
    await prisma.user.updateMany({ where: { status: "PENDING" }, data: { status: "APPROVED" } });
    await prisma.wedding.delete({ where: { id: 1 } });
  }
  console.log(`커플 옮기기: 카테고리 ${c.count} · 이벤트 ${e.count} · 결제 ${x.count} · 메모 ${n.count} · 사용자 ${joined}명 → 첫 커플`);
}

main()
  .catch((e) => {
    console.error("커플 옮기기 실패", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

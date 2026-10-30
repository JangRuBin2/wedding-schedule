import { prisma } from "./db";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from "./meta";

const findAll = () => prisma.category.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });

/** 카테고리 목록. 처음이면 기본 6개를 넣고, '기타'는 항상 있게 함 */
export async function getCategories() {
  const list = await findAll();
  if (list.length === 0) {
    await prisma.category.createMany({ data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, order: i })), skipDuplicates: true });
    return findAll();
  }
  if (!list.some((c) => c.name === FALLBACK_CATEGORY)) {
    await prisma.category.upsert({
      where: { name: FALLBACK_CATEGORY },
      create: { name: FALLBACK_CATEGORY, color: "#9ca3af", order: 999 },
      update: {},
    });
    return findAll();
  }
  return list;
}

/** 폼 값이 있는 카테고리 이름이면 그대로, 아니면 '기타' */
export async function validCategory(v: unknown) {
  const name = String(v ?? "");
  return (await getCategories()).some((c) => c.name === name) ? name : FALLBACK_CATEGORY;
}

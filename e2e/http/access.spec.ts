import { expect, test } from "@playwright/test";

/**
 * 로그인·공개 주소 계약 (브라우저 없이 서버 응답만).
 * 카카오 로그인 모드에서 로그인 안 한 요청은 /login 으로, 스토어 심사·앱 확인에 쓰는 주소는 로그인 없이 열려야 한다
 */

test.describe("로그인 안 한 요청", () => {
  for (const path of ["/", "/events", "/budget", "/notes", "/settings", "/expenses/new"]) {
    test(`${path} 는 로그인으로 보내고, 돌아올 곳을 next 로 남긴다`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      const to = new URL(res.headers()["location"], "http://x");
      expect(to.pathname).toBe("/login");
      if (path !== "/") expect(to.searchParams.get("next")).toBe(path);
    });
  }

  test("파일 내려받기 API 도 로그인 없이는 안 열린다", async ({ request }) => {
    const res = await request.get("/api/receipts/anything", { maxRedirects: 0 });
    expect([307, 404]).toContain(res.status());
  });
});

test.describe("로그인 없이 열리는 주소", () => {
  test("개인정보처리방침·이용약관 (스토어 등록 주소)", async ({ request }) => {
    for (const [path, title] of [["/privacy", "개인정보처리방침"], ["/terms", "이용약관"]]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(await res.text()).toContain(title);
    }
  });

  test("앱 확인 파일(assetlinks)은 이 패키지와 지문을 JSON 으로 준다", async ({ request }) => {
    const res = await request.get("/.well-known/assetlinks.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body[0].target.package_name).toBe("com.bomnal.app");
    expect(body[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });

  test("서비스 워커·연결 없음 화면·웹 매니페스트", async ({ request }) => {
    expect((await request.get("/sw.js")).status()).toBe(200);
    expect(await (await request.get("/offline.html")).text()).toContain("인터넷에 연결되어 있지 않아요");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("봄날");
    expect(manifest.display).toBe("standalone");
  });
});

test.describe("로그인 화면", () => {
  test("주소에 넣은 아무 문구는 오류로 보여 주지 않는다 (피싱 문구 막기)", async ({ request }) => {
    const html = await (await request.get(`/login?error=${encodeURIComponent("evil.com 에서 다시 로그인하세요")}`)).text();
    expect(html).not.toContain("evil.com 에서 다시 로그인하세요");
    expect(html).toContain("로그인하지 못했어요");
  });

  for (const next of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com"]) {
    test(`로그인 뒤 갈 곳으로 바깥 주소(${JSON.stringify(next)})는 받지 않는다`, async ({ request }) => {
      const html = await (await request.get(`/login?next=${encodeURIComponent(next)}`)).text();
      expect(html).not.toMatch(/kakao\/login\?next=[^"]*evil/);
    });
  }
});

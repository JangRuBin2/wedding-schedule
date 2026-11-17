/**
 * 플레이스토어용 안드로이드 앱(TWA) 빌드: android/twa-manifest.json → 안드로이드 프로젝트 생성 → Gradle → 서명.
 * 결과: android/build/out/bomnal-<버전>.aab (플레이스토어 업로드용), bomnal-<버전>.apk (휴대폰에 바로 설치해 보기용)
 *
 * 필요: JDK 17+, Android SDK (ANDROID_HOME), @bubblewrap/core (npx 로 받음)
 * 환경 변수:
 *   KEYSTORE            업로드 키 파일 경로 (기본 android/upload.keystore)
 *   KEYSTORE_PASSWORD   키 저장소 비밀번호
 *   KEY_ALIAS           키 이름 (기본 upload)
 *   KEY_PASSWORD        키 비밀번호 (기본 KEYSTORE_PASSWORD 와 같음)
 *   VERSION_CODE        플레이스토어 버전 번호 (올릴 때마다 1씩 키우기, 기본 twa-manifest 값)
 *   VERSION_NAME        사람이 보는 버전 (기본 twa-manifest 값)
 *   ASSET_BASE          아이콘·웹 매니페스트를 받을 주소를 바꿀 때 (로컬 테스트용, 예: http://localhost:8099)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TwaGenerator, TwaManifest, ConsoleLog } from "@bubblewrap/core";

const root = resolve(import.meta.dirname, "../..");
const dir = join(root, "android");
const project = join(dir, "build", "project");
const out = join(dir, "build", "out");
const env = process.env;

const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error("ANDROID_HOME 이 없어요 (Android SDK 경로)");
const keystore = resolve(env.KEYSTORE || join(dir, "upload.keystore"));
const storePass = env.KEYSTORE_PASSWORD;
const alias = env.KEY_ALIAS || "upload";
const keyPass = env.KEY_PASSWORD || storePass;
if (!existsSync(keystore) || !storePass) throw new Error("서명 키(KEYSTORE, KEYSTORE_PASSWORD)가 없어요");

const json = JSON.parse(readFileSync(join(dir, "twa-manifest.json"), "utf8"));
if (env.VERSION_CODE) json.appVersionCode = Number(env.VERSION_CODE);
if (env.VERSION_NAME) json.appVersion = env.VERSION_NAME;
if (env.ASSET_BASE) {
  for (const k of ["iconUrl", "maskableIconUrl", "webManifestUrl"]) json[k] = json[k].replace(/^https:\/\/[^/]+/, env.ASSET_BASE);
}
json.signingKey = { path: keystore, alias };
const version = `${json.appVersion}-${json.appVersionCode}`;

console.log(`▶ 프로젝트 만들기 (${json.packageId} ${version})`);
rmSync(project, { recursive: true, force: true });
mkdirSync(project, { recursive: true });
await new TwaGenerator().createTwaProject(project, new TwaManifest(json), new ConsoleLog("twa"));
writeFileSync(join(project, "local.properties"), `sdk.dir=${sdk}\n`);

// R8(코드 줄이기)이 TWA 라이브러리의 클래스 이름을 바꾸면, 실행할 때 이름으로 찾는 구성 요소를 못 찾아
// 앱이 바로 죽는다 ("Component class R.u does not exist" — 2026-11-17 에뮬레이터에서 확인).
// 생성된 프로젝트에는 규칙 파일이 없어서 직접 붙인다
const gradleFile = join(project, "app", "build.gradle");
const gradle = readFileSync(gradleFile, "utf8");
const patched = gradle.replace(/minifyEnabled true/, "minifyEnabled true\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'");
if (patched === gradle) throw new Error("app/build.gradle 에서 minifyEnabled 를 못 찾았어요 (생성기 변경?)");
writeFileSync(gradleFile, patched);
writeFileSync(
  join(project, "app", "proguard-rules.pro"),
  ["# TWA 라이브러리는 이름으로 구성 요소를 켜고 찾으므로 이름을 바꾸지 않음", "-keep class com.google.androidbrowserhelper.** { *; }", "-keep class androidx.browser.** { *; }", ""].join("\n"),
);

console.log("▶ Gradle 빌드");
const gradlew = join(project, process.platform === "win32" ? "gradlew.bat" : "gradlew");
execFileSync("chmod", ["+x", gradlew]);
execFileSync(gradlew, ["bundleRelease", "assembleRelease", "--no-daemon", "--stacktrace"], { cwd: project, stdio: "inherit" });

console.log("▶ 서명");
mkdirSync(out, { recursive: true });
const aabIn = join(project, "app/build/outputs/bundle/release/app-release.aab");
const aab = join(out, `bomnal-${version}.aab`);
copyFileSync(aabIn, aab);
execFileSync("jarsigner", ["-sigalg", "SHA256withRSA", "-digestalg", "SHA-256", "-keystore", keystore, "-storepass", storePass, "-keypass", keyPass, aab, alias], { stdio: "inherit" });

const tools = join(sdk, "build-tools");
const bt = join(tools, readdirSync(tools).sort().at(-1));
const apkIn = join(project, "app/build/outputs/apk/release/app-release-unsigned.apk");
const aligned = join(out, "aligned.apk");
const apk = join(out, `bomnal-${version}.apk`);
execFileSync(join(bt, "zipalign"), ["-f", "-p", "4", apkIn, aligned]);
execFileSync(join(bt, "apksigner"), ["sign", "--ks", keystore, "--ks-pass", `pass:${storePass}`, "--ks-key-alias", alias, "--key-pass", `pass:${keyPass}`, "--out", apk, aligned], { stdio: "inherit" });
rmSync(aligned);

const cert = execFileSync("keytool", ["-list", "-v", "-keystore", keystore, "-storepass", storePass, "-alias", alias], { encoding: "utf8" });
const sha = /SHA256:\s*([0-9A-F:]+)/.exec(cert)?.[1];
console.log(`\n✔ ${aab}\n✔ ${apk}\n업로드 키 SHA-256 지문 (src/lib/android.ts 의 sha256 에 넣기): ${sha}`);

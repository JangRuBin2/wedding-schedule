import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 사진 올리기: 브라우저에서 줄여서 보내지만 여러 장이면 기본 1MB를 넘어서 늘림 (Vercel 요청 한도 4.5MB 안)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;

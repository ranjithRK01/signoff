/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep firebase / gRPC / OpenTelemetry as Node externals — avoids missing vendor-chunks in dev
  experimental: {
    serverComponentsExternalPackages: [
      "firebase-admin",
      "firebase-admin/app",
      "firebase-admin/storage",
      "@google-cloud/storage",
      "@google-cloud/firestore",
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

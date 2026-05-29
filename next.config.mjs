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
};

export default nextConfig;

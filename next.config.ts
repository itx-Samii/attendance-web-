import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js NOT to bundle these heavy server-only packages.
  // whatsapp-web.js pulls in puppeteer, unzipper, @aws-sdk/client-s3, etc.
  // which are Node.js native modules that must run as-is on the server.
  serverExternalPackages: [
    'whatsapp-web.js',
    'puppeteer',
    'puppeteer-core',
    'unzipper',
    '@aws-sdk/client-s3',
    'qrcode',
  ],
};

export default nextConfig;

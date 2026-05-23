/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bluefood/shared'],
  // bullmq and ioredis use native Node.js modules — must not be bundled by webpack
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
};

module.exports = nextConfig;

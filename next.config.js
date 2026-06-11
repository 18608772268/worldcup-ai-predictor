/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.externals = [...config.externals, { 'playwright': 'commonjs playwright' }];
    return config;
  },
};

module.exports = nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [`${process.env.HOME_DEV_ORIGIN}`],
};

export default nextConfig;

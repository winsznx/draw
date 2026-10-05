import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // Workers has no Next image optimizer without Cloudflare Images.
  images: { unoptimized: true },
};

export default config;

if (process.env.NODE_ENV === 'development') {
  // Lets `next dev` read Cloudflare bindings the same way the deployed worker does.
  void import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev());
}

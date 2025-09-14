import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  // add to all pages to enable > export const experimental_ppr = true
  // experimental: {
  //   ppr: 'incremental',
  // },
  eslint: {dirs: ['src']}
}

//export default nextConfig
export default withBundleAnalyzer(nextConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ad creatives are served through our own /api/image proxy (Meta's CDN blocks
  // hotlinks and the URLs expire), so we don't whitelist remote domains here.
  reactStrictMode: true,
};

export default nextConfig;

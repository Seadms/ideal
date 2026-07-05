/** @type {import('next').NextConfig} */
const nextConfig = {
  // node-ical (via rrule-temporal → temporal-polyfill) breaks when bundled by
  // Turbopack ("e.BigInt is not a function") — load it as a native Node dep.
  serverExternalPackages: ['node-ical'],
}

export default nextConfig

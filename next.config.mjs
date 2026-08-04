/** @type {import('next').NextConfig} */
const nextConfig = {
  // node-ical (via rrule-temporal → temporal-polyfill) breaks when bundled by
  // Turbopack ("e.BigInt is not a function") — load it as a native Node dep.
  serverExternalPackages: ['node-ical'],

  // Gym / Diet / Progress merged into /body. Old URLs (bookmarks, an
  // already-installed PWA icon) keep working.
  async redirects() {
    return [
      { source: '/gym', destination: '/body', permanent: false },
      { source: '/diet', destination: '/body?tab=nutrition', permanent: false },
      { source: '/progress', destination: '/body?tab=progress', permanent: false },
      { source: '/school', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig

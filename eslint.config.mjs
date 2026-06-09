import next from 'eslint-config-next'

const config = [
  ...next,
  {
    rules: {
      // Apostrophes/quotes in copy render fine; not worth escaping by hand.
      'react/no-unescaped-entities': 'off',
      // Reading browser-only APIs (Notification, PushManager) on mount is the
      // intended pattern here — keep it visible as a warning, not an error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'public/sw.js'],
  },
]

export default config

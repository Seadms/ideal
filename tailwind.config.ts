import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#111113',
          elevated: '#1a1a1e',
          hover: '#222226',
        },
        border: {
          DEFAULT: '#252529',
          muted: '#1e1e22',
        },
        gold: {
          DEFAULT: '#f59e0b',
          muted: '#92400e',
          dim: '#78350f',
        },
        violet: {
          xp: '#8b5cf6',
          'xp-muted': '#4c1d95',
        },
        streak: {
          DEFAULT: '#10b981',
          muted: '#064e3b',
        },
      },
      animation: {
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(4px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}

export default config

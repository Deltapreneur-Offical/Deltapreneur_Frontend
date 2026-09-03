/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0a0a0f',
        'bg-card': '#111118',
        'bg-input': '#16161f',
        'border-dark': '#2a2a3a',
        'border-hover': '#3d3d55',
        'gold': {
          DEFAULT: '#c8a96e',
          dim: '#9a7d4a',
        },
        'purple': {
          DEFAULT: '#9333ea',
          dark: '#7c3aed',
          light: '#c4b5fd',
        },
        'text': {
          DEFAULT: '#e8e0d0',
          dim: '#8a8099',
          faint: '#4a4460',
        },
      },
      fontFamily: {
        sans: ['"Guild A Display"', '"Guild A Display Regular"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Guild A Display"', '"Guild A Display Regular"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body: ['"Guild A Display"', '"Guild A Display Regular"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'DEFAULT': '10px',
        'lg': '18px',
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        },
        'confetti-fall': {
          '0%':   { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '85%':  { opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(var(--rotation))', opacity: '0' },
        },
        'confetti-burst': {
          '0%':   { transform: 'translate(var(--tx-start, 0), var(--ty-start, 0)) rotate(0deg) scale(1)', opacity: '1' },
          '70%':  { opacity: '1' },
          '100%': { transform: 'translate(var(--tx-end, 0), var(--ty-end, 100vh)) rotate(var(--rotation, 360deg)) scale(0.3)', opacity: '0' },
        }
      },
      animation: {
        spin: 'spin 0.7s linear infinite',
        fadeIn: 'fadeIn 0.2s ease',
        slideUp: 'slideUp 0.25s ease',
        shimmer: 'shimmer 2s linear infinite',
        'confetti-fall': 'confetti-fall var(--duration, 4s) ease-in forwards',
        'confetti-burst': 'confetti-burst var(--duration, 1.5s) cubic-bezier(.15,.8,.3,1) forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: token('surface'),
        subtle: token('subtle'),
        border: token('border'),
        primary: token('primary'),
        'primary-soft': token('primary-soft'),
        streak: token('streak'),
        completed: token('completed'),
        missed: token('missed'),
        text: token('text'),
        muted: token('muted'),
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(28 25 23 / 0.04), 0 1px 1px rgb(28 25 23 / 0.03)',
        sheet: '0 -8px 32px rgb(28 25 23 / 0.12)',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        'rise-in': 'rise-in 320ms ease-out both',
        pop: 'pop 360ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        violet: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        dark: {
          bg:   '#121212',
          card: '#1E1E24',
          card2: '#252530',
          border: 'rgba(255,255,255,0.07)',
        },
        light: {
          bg:   '#FAFAFC',
          card: '#FFFFFF',
          border: 'rgba(0,0,0,0.08)',
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      boxShadow: {
        'card-dark': '0 1px 3px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        'card-light': '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'glow': '0 0 40px rgba(124,58,237,0.18)',
        'glow-lg': '0 0 80px rgba(124,58,237,0.25)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [forms],
}

export default config

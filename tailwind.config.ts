import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C89B3C',
          light: '#E8C96A',
          dark: '#8B6B2A',
          muted: '#C89B3C33',
        },
        navy: {
          DEFAULT: '#0A0E1A',
          card: '#0F1823',
          deep: '#0C223F',
          border: '#1A2535',
        },
        teal: {
          DEFAULT: '#0596AA',
          light: '#07B8CF',
          muted: '#0596AA33',
          bright: '#4ECDC4',
        },
        success: '#00D364',
        danger: '#FF4444',
        text: {
          primary: '#E8E0D0',
          muted: '#8B929A',
          dim: '#4A5568',
        },
      },
      fontFamily: {
        sans: ['Exo 2', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'system-ui', 'sans-serif'],
        mono: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(200, 155, 60, 0.3)',
        'gold-lg': '0 0 40px rgba(200, 155, 60, 0.4)',
        teal: '0 0 20px rgba(5, 150, 170, 0.3)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        float: 'float 3s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(200, 155, 60, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(200, 155, 60, 0.6)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

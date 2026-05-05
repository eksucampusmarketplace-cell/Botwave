import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: 'var(--green)',
        cyan: 'var(--cyan)',
        dark: 'var(--dark)',
        card: 'var(--card)',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
        body: ['Exo 2', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.3)',
      },
      animation: {
        'pulse-border': 'pulse-border 2s infinite',
        'fade-in-down': 'fadeInDown 0.8s ease both',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: '#00ff88', boxShadow: 'none' },
          '50%': { borderColor: '#00e5ff', boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)' },
        },
        'fadeInDown': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

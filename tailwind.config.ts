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
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        },
        accent: 'var(--accent)',
        surface: 'var(--surface)',
        // Backward-compatible aliases for dashboard pages
        green: 'var(--green)',
        cyan: 'var(--cyan)',
        dark: 'var(--dark)',
        card: 'var(--card)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        'card-hover': 'var(--card-shadow-hover)',
        glow: 'none',
        'glow-cyan': 'none',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease both',
        'fade-in': 'fadeIn 0.6s ease both',
        'fade-in-down': 'fadeInDown 0.8s ease both',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pulse-border': 'pulse-border 2s infinite',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'var(--green)', boxShadow: 'none' },
          '50%': { borderColor: 'var(--cyan)', boxShadow: '0 0 8px rgba(8, 145, 178, 0.2)' },
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
  plugins: [require('@tailwindcss/typography')],
};

export default config;

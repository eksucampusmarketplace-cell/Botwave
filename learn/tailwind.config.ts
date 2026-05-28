import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fresh dark theme for learning platform
        background: '#0F172A', // dark slate
        foreground: '#F8FAFC', // slate 50
        primary: {
          DEFAULT: '#3B82F6', // blue 500
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#64748B', // slate 500
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#10B981', // emerald 500
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#334155', // slate 600
          foreground: '#94A3B8', // slate 400
        },
        border: '#475569', // slate 700
        card: {
          DEFAULT: '#1E293B', // slate 800
          foreground: '#F8FAFC',
        },
        // For syntax highlighting (we'll use a dark theme)
        syntax: {
          comment: '#64748B',
          string: '#10B981',
          variable: '#F8FAFC',
          keyword: '#3B82F6',
          number: '#F59E0B',
          constant: '#8B5CF6',
          className: '#EC4899',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease both',
        'fade-in-up': 'fadeInUp 0.6s ease both',
        'fade-in-down': 'fadeInDown 0.8s ease both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
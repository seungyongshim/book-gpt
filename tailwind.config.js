/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'hsl(var(--color-surface) / <alpha-value>)',
          alt: 'hsl(var(--color-surface-alt) / <alpha-value>)',
        },
        border: 'hsl(var(--color-border) / <alpha-value>)',
        primary: 'hsl(var(--color-primary) / <alpha-value>)',
        danger: 'hsl(var(--color-danger) / <alpha-value>)',
      },
      boxShadow: {
        elevated: '0 2px 6px -1px rgba(0,0,0,0.2),0 4px 12px -2px rgba(0,0,0,0.15)',
      },
      keyframes: {
        spinSlow: { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        spinSlow: 'spinSlow 3s linear infinite',
      },
    },
  },
  plugins: [],
};

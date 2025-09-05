/**** Tailwind Config ****/ 
/** 추가 시멘틱 컬러 토큰 및 다크 모드 클래스 전략 **/
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surfaceAlt: 'var(--color-surface-alt)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        textDim: 'var(--color-text-dim)',
        primary: 'var(--color-primary)',
        primaryHover: 'var(--color-primary-hover)',
        danger: 'var(--color-danger)',
        warn: 'var(--color-warn)',
        success: 'var(--color-success)',
        info: 'var(--color-info)'
      },
      boxShadow: {
        'elev-1': '0 1px 2px -1px hsl(220 40% 2% / 0.4), 0 1px 3px hsl(220 40% 2% / 0.3)',
        'elev-2': '0 4px 16px -2px hsl(220 40% 2% / 0.45)'
      },
      animation: { 'pulse-slow': 'pulse 3s ease-in-out infinite' }
    }
  },
  plugins: []
};

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand orange sampled from the KaamSet logo; 700 is the accessible text-on-white shade.
        brand: { 50: '#FFF4EA', 100: '#FFE6D0', 200: '#FFCFA3', 300: '#FFB26B', 400: '#FF9438', 500: '#FF7A12', 600: '#F26B00', 700: '#C2410C', 800: '#9A3412' },
        ink: { 900: '#151922', 800: '#1F2430', 700: '#2E3442', 600: '#4A5162', 500: '#5B6272', 400: '#8A90A0' },
        paper: '#FFFBF7',
        line: '#EDE6DD',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(31,36,48,.05), 0 8px 24px -12px rgba(31,36,48,.12)' },
      borderRadius: { '2xl': '1.1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
export default config;

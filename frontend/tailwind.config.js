/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7C5CFC', // Custom primary purple accent
          600: '#6845f9',
          700: '#5532eb',
          800: '#4624d6',
          900: '#3a1cb2',
          950: '#230f78',
        },
        panel: {
          bg: '#0D1117',
          sidebar: '#161B22',
          editor: '#0D1117',
          border: '#30363D',
          active: '#21262D',
          text: '#8B949E',
          hover: '#21262D',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}

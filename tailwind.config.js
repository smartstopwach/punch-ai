/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist', 'Inter', 'SF Pro Display', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: '#07080A',
        graphite: '#121316',
        panel: '#181A1E',
        line: '#24272E',
        accent: '#E8FF2A',
        accent2: '#FFFFFF',
        muted: '#8A8F98',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

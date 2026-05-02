/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-light': '#e0e7ff',
        orange: '#f59e0b',
        green: '#10b981',
        red: '#ef4444',
        blue: '#3b82f6',
        purple: '#8b5cf6',
      }
    }
  },
  plugins: []
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0a12',
        'space-accent': '#00d4ff',
        'space-accent-dim': '#0099bb',
        'space-panel': '#12121a',
        'space-border': '#1a1a2e',
      }
    },
  },
  plugins: [],
}

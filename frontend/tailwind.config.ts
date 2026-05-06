/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'aura-bg': '#0F1219',
        'aura-surface': '#1E293B',
        'aura-border': '#334155',
        'aura-mint': '#A7F3D0',
        'aura-coral': '#FCA5A5',
        'aura-lavender': '#C7D2FE',
        'aura-gold': '#FDE68A',
      },
      borderRadius: {
        'aura': '24px',
      },
      fontFamily: {
        sans: ['Poppins', 'Quicksand', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

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
        oled: {
          base: '#040508',
          card: '#0D0F17',
          cardBorder: '#1A1D2B',
          hover: '#161926'
        },
        driver: {
          profit: '#00E676', // Emerald Neon
          warning: '#FFD600', // Amber
          danger: '#FF1744', // Red
          accent: '#3D5AFE', // Electric Blue
          uber: '#E6E6E6',
          ninetynine: '#FF6D00',
          indrive: '#7C4DFF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

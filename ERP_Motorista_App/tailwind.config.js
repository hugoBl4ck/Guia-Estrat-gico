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
        pma: {
          acid: '#D4FF00',
          acidHover: '#b8de00',
          dark: '#07080C',
          card: '#0B0D13',
          border: 'rgba(255, 255, 255, 0.10)'
        },
        oled: {
          base: '#07080C',
          card: '#0B0D13',
          cardBorder: '#1A1D2B',
          hover: '#141722'
        },
        driver: {
          profit: '#D4FF00', // Acid Neon (PMA Style)
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

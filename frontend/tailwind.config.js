/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        kalam: ['Kalam', 'cursive'],
        patrick: ['Patrick Hand', 'cursive'],
      },
      colors: {
        paper: '#fdfbf7',
        ink: '#2d2d2d',
        muted: '#e5e0d8',
        accent: '#ff4d4d',
        bluepen: '#2d5da1'
      },
      borderRadius: {
        'wobbly': '255px 15px 225px 15px / 15px 225px 15px 255px',
        'wobblyMd': '15px 225px 15px 255px / 255px 15px 225px 15px',
      }
    },
  },
  plugins: [],
}

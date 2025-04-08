/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('tailwindcss/defaultConfig')],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'funkyPink': '#ff4ecd',
        'funkyBlue': '#00f0ff',
        'funkyYellow': '#fffb00',
        'funkyGreen': '#00ff9d',
        'funkyPurple': '#9d00ff',
      },
    },
  },
  plugins: [],
}

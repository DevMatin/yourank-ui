/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{js,ts,jsx,tsx}"  // optional, falls du da JSX/TSX hast
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lufga', 'sans-serif']
      }
    }
  },
  plugins: []
}

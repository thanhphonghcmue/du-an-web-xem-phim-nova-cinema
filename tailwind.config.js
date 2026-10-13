/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { ink: "#0B0E14", amber: "#F5C518", muted: "#94A3B8" },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Barlow Condensed", "sans-serif"],
      },
    },
  },
  plugins: [],
};

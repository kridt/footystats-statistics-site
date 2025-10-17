/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // <— VIGTIGT
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#071B26",
        neonBlue: "#00C9FF",
        neonGreen: "#39FF14",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0,201,255,0.35)",
        neonGreen: "0 0 20px rgba(57,255,20,0.35)",
      },
    },
    fontFamily: {
      sans: ["Poppins", "ui-sans-serif", "system-ui"],
    },
  },
  plugins: [],
};

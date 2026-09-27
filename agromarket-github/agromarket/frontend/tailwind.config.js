/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        primary: { DEFAULT: "#2E7D32", dark: "#1B4332", accent: "#52B788" },
        surface: "#FFFFFF",
        canvas: "#F7F9F6",
        ink: { DEFAULT: "#1F2937", soft: "#6B7280" },
        line: "#E5E7EB",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
        pop: "0 10px 30px rgba(16,24,40,.12)",
      },
    },
  },
  plugins: [],
};

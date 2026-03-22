import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f6fe",
          100: "#dbe9fb",
          200: "#b8d3f5",
          300: "#84b2eb",
          400: "#5094e7",
          500: "#2e81e5",
          600: "#1a6ed3",
          700: "#1557a8",
          800: "#104484",
          900: "#0c3464",
          950: "#071f3b",
        },
      },
    },
  },
  plugins: [],
};

export default config;

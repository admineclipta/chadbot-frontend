// @ts-check
const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#ffffff",
            foreground: "#11181C",
            primary: {
              50: "#f5f0ff",
              100: "#ede7ff",
              200: "#dfd7f4",
              300: "#c7b3ff",
              400: "#aa88f9",
              500: "#7945f2",
              600: "#5413ee",
              700: "#4410c9",
              800: "#350da3",
              900: "#270a7d",
              DEFAULT: "#5413ee",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#c1fe72",
              foreground: "#000000",
            },
          },
        },
        dark: {
          colors: {
            background: "#0D1117",
            foreground: "#ECEDEE",
            primary: {
              DEFAULT: "#7945f2",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#c1fe72",
              foreground: "#000000",
            },
          },
        },
      },
    }),
  ],
};

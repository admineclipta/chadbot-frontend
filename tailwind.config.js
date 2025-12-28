const { heroui } = require("@heroui/theme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      animation: {
        'rainbow': 'rainbow 3s ease infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      keyframes: {
        rainbow: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
        'slide-in-right': {
          from: {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'spin-slow': {
          to: {
            transform: 'rotate(360deg)',
          },
        },
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
          50: "#f7ffed",
          100: "#edffd9",
          200: "#dfffb8",
          300: "#d1ff8f",
          400: "#c1fe72",
          500: "#a8e05f",
          600: "#8fc24d",
          700: "#76a43c",
          800: "#5d862c",
          900: "#44681d",
          DEFAULT: "#c1fe72",
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#dfd7f4",
          foreground: "#5413ee",
        },
        accent: {
          DEFAULT: "#aa88f9",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#11181c",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#11181c",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "violet-gradient": "linear-gradient(135deg, #7945f2 0%, #5413ee 100%)",
        "purple-gradient": "linear-gradient(135deg, #aa88f9 0%, #7945f2 50%, #5413ee 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
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
    require("tailwindcss-animate"),
  ],
}

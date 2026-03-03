import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
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
      colors: {
        primary: "#FE7743",
        secondary: "#273F4F",
        light: "#EFEEEA",
        dark: "#000000",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "progress-pulse": "progressPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: {
            opacity: "0",
            transform: "translateY(12px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        fadeInDown: {
          from: {
            opacity: "0",
            transform: "translateY(-16px) scale(0.97)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        slideUp: {
          from: {
            opacity: "0",
            transform: "translateY(100%)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        progressPulse: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.7",
          },
        },
      },

      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(39, 63, 79, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(39, 63, 79, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;

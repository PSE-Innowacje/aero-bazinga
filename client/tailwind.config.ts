import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#003E7E",
          hover: "#002E5E",
        },
        accent: {
          DEFAULT: "#D20A11",
          hover: "#A20008",
        },
        secondary: "#707070",
        surface: "#F8F9FA",
        background: "#FFFFFF",
        text: {
          DEFAULT: "#212529",
          muted: "#707070",
        },
        border: "#CED4DA",
        "border-subtle": "#E9ECEF",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        label: ["12px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        heading: ["20px", { lineHeight: "1.2", fontWeight: "600" }],
        display: ["28px", { lineHeight: "1.1", fontWeight: "600" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

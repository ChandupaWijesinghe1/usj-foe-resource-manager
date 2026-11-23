import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          red: "#C41E3A",
          "red-dark": "#8B1538",
          gold: "#FDB913",
          "gold-light": "#FFD700",
          navy: "#111A3A",
          "navy-light": "#1E293B",
        },
        usj: {
          gold: "#FDB913",
          maroon: "#C41E3A",
          navy: "#111A3A",
          sky: "#0284C7",
        },
        dept: {
          ce: "#73CDE2",
          "ce-fg": "#0B6478",
          "ce-soft": "#E8F7FB",
          co: "#FFBD58",
          "co-fg": "#8A4B00",
          "co-soft": "#FFF4E0",
          ee: "#914486",
          "ee-fg": "#7E3A74",
          "ee-soft": "#F6EAF4",
          me: "#0F0F87",
          "me-fg": "#0F0F87",
          "me-soft": "#E8E8F6",
          is: "#E53935",
          "is-fg": "#B42318",
          "is-soft": "#FDECEA",
        },
      },
      boxShadow: {
        "elevation-sm": "0 1px 2px 0 rgb(16 24 40 / 0.04)",
        "elevation-md": "0 2px 8px -2px rgb(16 24 40 / 0.08), 0 1px 3px -1px rgb(16 24 40 / 0.04)",
        "elevation-lg": "0 12px 28px -8px rgb(16 24 40 / 0.14), 0 4px 10px -4px rgb(16 24 40 / 0.06)",
        "glow-crimson": "0 0 20px rgba(196, 30, 58, 0.3)",
        "glow-gold": "0 0 20px rgba(253, 185, 19, 0.35)",
      },
      borderRadius: {
        card: "1.125rem",
        control: "0.75rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

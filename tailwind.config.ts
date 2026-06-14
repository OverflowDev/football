import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: "#111118",
        card: "#1a1a24",
        border: "#2a2a3a",
        primary: {
          DEFAULT: "#6366f1",
          foreground: "#f1f1f3",
        },
        up: "#22c55e",
        down: "#ef4444",
        gold: "#f59e0b",
        content: {
          DEFAULT: "#f1f1f3",
          secondary: "#8888aa",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        // numeric/price contexts: Sora with tabular figures (see tabular-nums usage)
        mono: ["var(--font-sora)", "ui-monospace", "monospace"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      keyframes: {
        "flash-up": {
          "0%": { backgroundColor: "rgba(34,197,94,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        "flash-down": {
          "0%": { backgroundColor: "rgba(239,68,68,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "aurora-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(40px, 30px) scale(1.12)" },
        },
        "aurora-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-50px, -25px) scale(1.08)" },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "flash-up": "flash-up 0.8s ease-out",
        "flash-down": "flash-down 0.8s ease-out",
        marquee: "marquee 40s linear infinite",
        shimmer: "shimmer 1.5s infinite",
        "aurora-1": "aurora-1 22s ease-in-out infinite",
        "aurora-2": "aurora-2 28s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

/**
 * Elegant, clean dark theme for AdGapIQ.
 * Palette: deep slate canvas, a refined indigo/violet accent, and a small set
 * of semantic colors for the comparison marks (lead/par/behind).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0f", // app background
        surface: "#12121a", // cards
        "surface-2": "#1a1a24", // raised cards / hovers
        border: "#23232f",
        accent: {
          DEFAULT: "#7c5cff", // violet
          soft: "#9d86ff",
          glow: "#6d4bff",
        },
        lead: "#34d399", // ✅ ahead (emerald)
        par: "#fbbf24", // ➖ on par (amber)
        behind: "#fb7185", // ❌ behind (rose)
        muted: "#8b8b9a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,0.25), 0 8px 40px -8px rgba(124,92,255,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "aurora-drift": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-3%,2%,0) scale(1.08)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

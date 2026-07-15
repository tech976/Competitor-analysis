import type { Config } from "tailwindcss";

/**
 * AdGapIQ palette — now theme-aware. Colors resolve to CSS variables (RGB
 * triplets) defined per theme in globals.css, so light/dark swap instantly and
 * Tailwind opacity modifiers (e.g. text-fg/70) still work via <alpha-value>.
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"), // app background
        surface: v("surface"), // cards
        "surface-2": v("surface-2"), // raised cards / hovers
        border: v("border"),
        fg: v("fg"), // primary foreground/text (was hard-coded white)
        accent: {
          DEFAULT: v("accent"), // violet
          soft: v("accent-soft"),
          glow: v("accent-glow"),
        },
        lead: v("lead"), // ✅ ahead (emerald)
        par: v("par"), // ➖ on par (amber)
        behind: v("behind"), // ❌ behind (rose)
        muted: v("muted"),
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

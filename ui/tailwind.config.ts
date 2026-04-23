import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prism: {
          bg:      "#0a0a0f",
          surface: "#0f0f1a",
          border:  "#1a1a2e",
          green:   "#00ff88",
          cyan:    "#00d4ff",
          red:     "#ff3366",
          yellow:  "#ffcc00",
          purple:  "#9945ff",
          dim:     "#4a4a6a",
          text:    "#c8d0e8",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "Courier New", "monospace"],
      },
      animation: {
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "shift-a": "#bfdbfe",
        "shift-b": "#bbf7d0",
        "shift-c": "#fde68a",
        "shift-g": "#e9d5ff",
        "shift-d12": "#fed7aa",
        "shift-n12": "#fecaca",
        "shift-off": "#f3f4f6",
        "shift-l":   "#fbcfe8",
      },
    },
  },
  plugins: [],
};

export default config;

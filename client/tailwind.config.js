/** @type {import('tailwindcss').Config} */

const colorVar = (name) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `rgb(var(${name}))`
    : `rgb(var(${name}) / ${opacityValue})`;

const semanticScale = (prefix) => ({
  50: colorVar(`--${prefix}-50`),
  100: colorVar(`--${prefix}-100`),
  200: colorVar(`--${prefix}-200`),
  300: colorVar(`--${prefix}-300`),
  400: colorVar(`--${prefix}-400`),
  500: colorVar(`--${prefix}-500`),
  600: colorVar(`--${prefix}-600`),
  700: colorVar(`--${prefix}-700`),
  800: colorVar(`--${prefix}-800`),
  900: colorVar(`--${prefix}-900`),
  950: colorVar(`--${prefix}-950`),
});

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: semanticScale("color-accent"),
        dark: semanticScale("color-surface"),
        green: semanticScale("color-accent"),
        blue: semanticScale("color-accent"),
        red: semanticScale("color-accent"),
        yellow: semanticScale("color-accent"),
        purple: semanticScale("color-accent"),
        cyan: semanticScale("color-accent"),
        amber: semanticScale("color-accent"),
        emerald: semanticScale("color-accent"),
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Manrope', 'sans-serif'],
        brand: ['Syne Mono', 'monospace'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

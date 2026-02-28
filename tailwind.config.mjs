/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    "flex", "items-center", "gap-1", "mt-1", "inline-block", "w-1", "size-4"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

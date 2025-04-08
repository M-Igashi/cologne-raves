/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    "bg-black", "text-white", "hover:bg-neutral-800",
    "border", "border-input", "hover:bg-neutral-100"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://cologne.ravers.workers.dev",
  integrations: [react(), mdx(), sitemap(), tailwind()],
  output: "static",
});
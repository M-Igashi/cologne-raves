// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://cologne.ravers.workers.dev",
  integrations: [
    react(), 
    sitemap({
      customPages: [],
      entryLimit: 10000,
    }), 
    tailwind()
  ],
  output: "static",
  build: {
    // Force inline all CSS to eliminate render-blocking (17KB is still small)
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Keep all CSS in one file for easier inlining
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // Consistent naming for assets
          assetFileNames: 'assets/[name].[hash][extname]',
        }
      }
    }
  }
});
// shadcn.config.ts
import type { Config } from 'tailwind-variants';

const config: Config = {
  slots: {
    base: '',
  },
  prefix: 'shadcn',
  themes: ['light', 'dark'],
  cwd: process.cwd(),
};

export default config;

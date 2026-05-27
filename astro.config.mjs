import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://geotagseditor.online',
  trailingSlash: 'always',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
});


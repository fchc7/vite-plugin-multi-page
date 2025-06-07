import { defineConfig } from 'vite';
import { viteMultiPage } from '../dist/index.mjs';

export default defineConfig({
  plugins: [viteMultiPage()],
});

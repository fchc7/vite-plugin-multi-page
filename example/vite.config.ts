import { defineConfig } from "vite";
import viteMultiPage from "../src/index";

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: "src/pages/**/*.{ts,js}",
      template: "index.html",
      exclude: ["src/main.ts", "src/vite-env.d.ts"],
      placeholder: "{{ENTRY_FILE}}",
      debug: true,
    }),
  ],
});

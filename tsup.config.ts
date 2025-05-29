import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "node16",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  external: ["vite", "glob"],
});

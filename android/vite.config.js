import { defineConfig } from "vite";

/** Dữ liệu tĩnh (hanzi-data, JSON) nằm trong app/src/main/assets/public */
export default defineConfig({
  base: "./",
  publicDir: "app/src/main/assets/public",
});

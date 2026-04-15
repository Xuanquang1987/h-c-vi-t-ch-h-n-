import { defineConfig } from "vite";

/** Dữ liệu tĩnh (hanzi-data, JSON) dùng chung với bundle trong android/app/src/main/assets/public */
export default defineConfig({
  base: "./",
  publicDir: "android/app/src/main/assets/public",
});

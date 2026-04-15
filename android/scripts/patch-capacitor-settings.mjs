/**
 * `npx cap sync` ghi đè capacitor.settings.gradle trỏ về node_modules.
 * Module Capacitor nhúng trong thư mục capacitor-android (cùng cấp app/).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gradle = path.join(__dirname, "..", "android", "capacitor.settings.gradle");
const content = `// Module Capacitor nhúng trong repo (sau cap sync chạy lại npm run patch:cap).
include ':capacitor-android'
project(':capacitor-android').projectDir = new File('capacitor-android')
`;
fs.writeFileSync(gradle, content, "utf8");
console.log("patched capacitor.settings.gradle → capacitor-android");

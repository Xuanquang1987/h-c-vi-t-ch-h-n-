/**
 * Copy stroke JSON from hanzi-writer-data into public/hanzi-data/
 * and write chars.json (sorted list of all characters with data).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "node_modules", "hanzi-writer-data");
const destDir = path.join(root, "public", "hanzi-data");

if (!fs.existsSync(srcDir)) {
  console.error("Missing node_modules/hanzi-writer-data. Run: npm install");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const chars = [];
let copied = 0;

for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith(".json") || name === "package.json") continue;
  const char = name.slice(0, -5);
  if ([...char].length !== 1) continue;

  const from = path.join(srcDir, name);
  const to = path.join(destDir, name);
  fs.copyFileSync(from, to);
  chars.push(char);
  copied++;
}

chars.sort((a, b) => a.codePointAt(0) - b.codePointAt(0));

fs.writeFileSync(
  path.join(destDir, "chars.json"),
  JSON.stringify(chars),
  "utf8"
);

const licenseSrc = path.join(srcDir, "ARPHICPL.TXT");
if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, path.join(destDir, "ARPHICPL.TXT"));
}

console.log(`prepare-hanzi-data: copied ${copied} characters → public/hanzi-data/`);

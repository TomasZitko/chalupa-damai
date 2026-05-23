// One-time local development setup
// Usage: node scripts/setup-local.js <password> [email]
// Example: node scripts/setup-local.js mysecretpassword admin@damai.cz

import bcrypt from "bcryptjs";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const password = process.argv[2];
const email = process.argv[3] ?? "admin@damai.cz";

if (!password) {
  console.error("Usage: node scripts/setup-local.js <password> [email]");
  console.error("Example: node scripts/setup-local.js mysecretpassword admin@damai.cz");
  process.exit(1);
}

console.log("Hashing password...");
const hash = await bcrypt.hash(password, 10);

const sql = `
INSERT INTO properties (name, slug, owner_email, owner_password_hash, active)
VALUES ('Chalupa Damai', 'damai', '${email}', '${hash}', 1)
ON CONFLICT(slug) DO UPDATE SET
  owner_email = excluded.owner_email,
  owner_password_hash = excluded.owner_password_hash;
`.trim();

const tmpFile = "scripts/_seed_tmp.sql";
writeFileSync(tmpFile, sql);

try {
  console.log("Applying migrations to local D1...");
  execSync("wrangler d1 migrations apply chalupa-db --local", { stdio: "inherit" });

  console.log("Seeding admin property...");
  execSync(`wrangler d1 execute chalupa-db --local --file=${tmpFile}`, { stdio: "inherit" });

  console.log("\n✓ Local database ready!");
  console.log(`  Admin email : ${email}`);
  console.log(`  Password    : ${password}`);
  console.log("\nNow start the servers:");
  console.log("  Terminal 1:  npm run dev           (backend, from backend/)");
  console.log("  Terminal 2:  npm run dev           (frontend, from frontend/)");
  console.log("  Browser:     http://localhost:5173/");
} finally {
  try { unlinkSync(tmpFile); } catch {}
}

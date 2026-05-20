// Usage: node scripts/hash-password.js <password>
// Outputs the bcrypt hash to paste into 0002_seed_property.sql
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);

-- Run this ONCE after 0001_init.sql.
-- Replace the hash below with the output of:
--   node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',10).then(console.log)"
--
-- Example property for chalupa "Damai":
INSERT OR IGNORE INTO properties (name, slug, owner_email, owner_password_hash, active)
VALUES (
  'Chalupa Damai',
  'damai',
  'owner@example.com',
  '$2a$10$REPLACE_THIS_WITH_REAL_BCRYPT_HASH',
  1
);

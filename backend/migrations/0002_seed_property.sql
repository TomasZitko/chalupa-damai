-- Run this ONCE after 0001_init.sql.
--
-- Before running, replace the values below:
--   1. Set owner_email to the real admin email address.
--   2. Generate a bcrypt hash for your chosen password:
--        node backend/scripts/hash-password.js
--      Copy the output hash and paste it in place of the hash below.
--
-- Deploy to remote DB:
--   npm run db:migrate:remote   (from backend/)
--
INSERT OR IGNORE INTO properties (name, slug, owner_email, owner_password_hash, active)
VALUES (
  'Chalupa Damai',
  'damai',
  'owner@example.com',           -- REPLACE with actual admin email
  '$2a$10$REPLACE_THIS_WITH_REAL_BCRYPT_HASH_FROM_hash-password_SCRIPT',
  1
);

-- U-0001, U-0002, ... generated atomically by the database.
-- Width grows past 9999 (U-10000) instead of truncating and colliding.
CREATE SEQUENCE user_id_seq;

CREATE FUNCTION next_user_id() RETURNS text AS $$
  SELECT 'U-' || lpad(n::text, greatest(4, length(n::text)), '0')
  FROM (SELECT nextval('user_id_seq') AS n) s
$$ LANGUAGE sql;

-- Backfill existing users in creation order, then continue after them.
UPDATE "users" u
SET "user_id" = 'U-' || lpad(r.n::text, greatest(4, length(r.n::text)), '0')
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM "users"
) r
WHERE u.id = r.id;

SELECT setval('user_id_seq', (SELECT count(*) FROM "users") + 1, false);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "user_id" SET DEFAULT next_user_id();

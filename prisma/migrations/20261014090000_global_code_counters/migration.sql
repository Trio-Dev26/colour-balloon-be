-- Decision Log D13 (changed 13 Oct 2026): codes no longer contain the level,
-- category or parent. Each type has one system-wide counter, at least 3 digits:
-- M001, U001 (later L001, QZ001, QN001). Existing records are renumbered
-- oldest first.

-- Two passes avoid unique-key clashes between old and new codes.
UPDATE "modules" SET "code" = 'TMP-' || "id";
UPDATE "modules" m
SET "code" = 'M' || lpad(x.n::text, greatest(3, length(x.n::text)), '0')
FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS n FROM "modules") x
WHERE m."id" = x."id";

UPDATE "units" SET "code" = 'TMP-' || "id";
UPDATE "units" u
SET "code" = 'U' || lpad(x.n::text, greatest(3, length(x.n::text)), '0')
FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS n FROM "units") x
WHERE u."id" = x."id";

-- Replace the old per-prefix counters (FM, FM01-U, ...) with one per type.
DELETE FROM "code_sequences";
INSERT INTO "code_sequences" ("scope", "last_value")
SELECT 'M', count(*) FROM "modules" HAVING count(*) > 0;
INSERT INTO "code_sequences" ("scope", "last_value")
SELECT 'U', count(*) FROM "units" HAVING count(*) > 0;

-- Replace mutable person names with stable user foreign keys.
BEGIN;

ALTER TABLE "StudentBadge" ADD COLUMN "assignedById" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "markedById" TEXT;

UPDATE "StudentBadge" badge SET "assignedById" = actor."id"
FROM "User" actor
WHERE badge."assignedBy" IS NOT NULL
  AND (badge."assignedBy" = actor."id" OR lower(trim(badge."assignedBy")) = lower(trim(actor."name")));
UPDATE "AttendanceRecord" attendance SET "markedById" = actor."id"
FROM "User" actor
WHERE attendance."markedBy" = actor."id"
   OR lower(trim(attendance."markedBy")) = lower(trim(actor."name"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "StudentBadge"
    WHERE "assignedBy" IS NOT NULL
      AND lower("assignedBy") NOT LIKE 'system%'
      AND "assignedById" IS NULL
  ) THEN
    RAISE EXCEPTION 'Actor migration aborted: badge assigner cannot be resolved to a user ID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "AttendanceRecord"
    WHERE lower("markedBy") NOT LIKE 'system%' AND "markedById" IS NULL
  ) THEN
    RAISE EXCEPTION 'Actor migration aborted: attendance marker cannot be resolved to a user ID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "AuditTrail" audit
    LEFT JOIN "User" actor ON actor."id" = audit."changedBy"
    WHERE audit."changedBy" IS NOT NULL AND actor."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Actor migration aborted: audit actor is not a valid user ID';
  END IF;
END $$;

CREATE INDEX "StudentBadge_assignedById_idx" ON "StudentBadge"("assignedById");
CREATE INDEX "AttendanceRecord_markedById_idx" ON "AttendanceRecord"("markedById");
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey"
  FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_changedBy_fkey"
  FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentBadge" DROP COLUMN "assignedBy";
ALTER TABLE "AttendanceRecord" DROP COLUMN "markedBy";

COMMIT;

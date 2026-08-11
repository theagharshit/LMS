BEGIN;
ALTER TABLE "StudentBadge" ADD COLUMN "assignedBy" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "markedBy" TEXT;
UPDATE "StudentBadge" badge SET "assignedBy" = COALESCE(actor."name", 'System')
FROM "User" actor WHERE actor."id" = badge."assignedById";
UPDATE "StudentBadge" SET "assignedBy" = 'System' WHERE "assignedBy" IS NULL;
UPDATE "AttendanceRecord" attendance SET "markedBy" = COALESCE(actor."name", 'System')
FROM "User" actor WHERE actor."id" = attendance."markedById";
UPDATE "AttendanceRecord" SET "markedBy" = 'System' WHERE "markedBy" IS NULL;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "markedBy" SET NOT NULL;
ALTER TABLE "AuditTrail" DROP CONSTRAINT IF EXISTS "AuditTrail_changedBy_fkey";
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT IF EXISTS "AttendanceRecord_markedById_fkey";
ALTER TABLE "StudentBadge" DROP CONSTRAINT IF EXISTS "StudentBadge_assignedById_fkey";
DROP INDEX IF EXISTS "AttendanceRecord_markedById_idx";
DROP INDEX IF EXISTS "StudentBadge_assignedById_idx";
ALTER TABLE "AttendanceRecord" DROP COLUMN "markedById";
ALTER TABLE "StudentBadge" DROP COLUMN "assignedById";
COMMIT;

-- Add an optional secondary phone to the canonical user record.
BEGIN;

ALTER TABLE "User" ADD COLUMN "secondaryPhone" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_secondaryPhone_check"
  CHECK (
    "secondaryPhone" IS NULL
    OR "secondaryPhone" ~ '^\+?[0-9][0-9 -]{6,19}$'
  );

COMMIT;

-- Calendar data now comes from normalized SchoolHoliday and Exam records.
DROP TABLE "CalendarEvent";

-- Token rotation is a self-referencing chain, not an unvalidated identifier.
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey"
  FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

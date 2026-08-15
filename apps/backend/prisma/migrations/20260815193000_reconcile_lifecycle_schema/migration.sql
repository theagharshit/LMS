-- Remove obsolete scheduling/lifecycle prototype fields after their values have
-- been migrated into AcademicYear and the normalized scheduling tables.
DROP INDEX IF EXISTS "Classroom_academicYear_isArchived_idx";
DROP INDEX IF EXISTS "SchoolHoliday_schoolId_date_idx";
DROP INDEX IF EXISTS "TimetableSlot_cohortId_dayOfWeek_idx";
DROP INDEX IF EXISTS "TimetableSlot_teacherId_dayOfWeek_idx";

ALTER TABLE "AcademicCohort" DROP COLUMN IF EXISTS "academicYear";
ALTER TABLE "Classroom" DROP COLUMN IF EXISTS "academicYear";
ALTER TABLE "SchoolHoliday"
  DROP COLUMN IF EXISTS "createdAt",
  DROP COLUMN IF EXISTS "endDate",
  DROP COLUMN IF EXISTS "type";
ALTER TABLE "Subject" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "TimetableSlot"
  DROP COLUMN IF EXISTS "academicYear",
  DROP COLUMN IF EXISTS "createdAt";

DO $$
BEGIN
  IF to_regclass('"StudentAcademicEnrollment_academicYearId_cohortId_rollNumber_ke"') IS NOT NULL THEN
    ALTER INDEX "StudentAcademicEnrollment_academicYearId_cohortId_rollNumber_ke"
      RENAME TO "StudentAcademicEnrollment_academicYearId_cohortId_rollNumbe_key";
  END IF;
  IF to_regclass('"TimetableSlot_schoolId_academicYearId_dayOfWeek_periodNumber_id"') IS NOT NULL THEN
    ALTER INDEX "TimetableSlot_schoolId_academicYearId_dayOfWeek_periodNumber_id"
      RENAME TO "TimetableSlot_schoolId_academicYearId_dayOfWeek_periodNumbe_idx";
  END IF;
END $$;

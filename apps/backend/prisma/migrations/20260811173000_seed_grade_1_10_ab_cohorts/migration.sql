-- Establish the supported cohort catalogue: Grades 1-10, Sections A and B.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AcademicCohort"
    WHERE "gradeLevel" NOT BETWEEN 1 AND 10 OR "section" NOT IN ('A', 'B')
  ) THEN
    RAISE EXCEPTION 'Cohort catalogue migration aborted: unsupported grade or section data exists';
  END IF;
END $$;

ALTER TABLE "AcademicCohort"
  ADD CONSTRAINT "AcademicCohort_gradeLevel_check"
  CHECK ("gradeLevel" BETWEEN 1 AND 10),
  ADD CONSTRAINT "AcademicCohort_section_check"
  CHECK ("section" IN ('A', 'B'));

INSERT INTO "AcademicCohort" ("id", "schoolId", "gradeLevel", "section")
SELECT
  'cohort-catalog-' || substr(md5(s."id" || ':' || grade::text || ':' || section), 1, 16),
  s."id",
  grade,
  section
FROM "School" s
CROSS JOIN generate_series(1, 10) AS grade
CROSS JOIN (VALUES ('A'), ('B')) AS sections(section)
ON CONFLICT ("schoolId", "gradeLevel", "section") DO NOTHING;

COMMIT;

BEGIN;

ALTER TABLE "AcademicCohort"
  DROP CONSTRAINT IF EXISTS "AcademicCohort_gradeLevel_check",
  DROP CONSTRAINT IF EXISTS "AcademicCohort_section_check";

DELETE FROM "AcademicCohort" c
USING "School" s, generate_series(1, 10) AS grade,
  (VALUES ('A'), ('B')) AS sections(section)
WHERE c."id" = 'cohort-catalog-' || substr(md5(s."id" || ':' || grade::text || ':' || section), 1, 16);

COMMIT;

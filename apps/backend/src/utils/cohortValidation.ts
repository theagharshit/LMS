export const SUPPORTED_GRADE_LEVELS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => index + 1),
);
export const SUPPORTED_SECTIONS = Object.freeze(['A', 'B'] as const);

export const normalizeCohortSelection = (gradeValue: unknown, sectionValue: unknown) => {
  const gradeLevel = Number(gradeValue);
  const section = String(sectionValue || '')
    .trim()
    .toUpperCase();

  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 10) {
    throw new Error('Grade level must be a whole number from 1 through 10.');
  }
  if (!SUPPORTED_SECTIONS.includes(section as (typeof SUPPORTED_SECTIONS)[number])) {
    throw new Error('Section must be A or B.');
  }

  return { gradeLevel, section };
};

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION lms_write_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AuditTrail" (
    "id", "tableName", "action", "previousData", "newData", "changedBy", "category", "createdAt"
  ) VALUES (
    gen_random_uuid()::text,
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NULLIF(current_setting('app.current_user', true), ''),
    'database',
    CURRENT_TIMESTAMP
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_user_changes
AFTER INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

CREATE TRIGGER audit_student_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON "StudentProfile"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

CREATE TRIGGER audit_classroom_changes
AFTER INSERT OR UPDATE OR DELETE ON "Classroom"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

CREATE TRIGGER audit_submission_changes
AFTER INSERT OR UPDATE OR DELETE ON "Submission"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

CREATE TRIGGER audit_quiz_submission_changes
AFTER INSERT OR UPDATE OR DELETE ON "QuizSubmission"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

CREATE TRIGGER audit_attendance_changes
AFTER INSERT OR UPDATE OR DELETE ON "AttendanceRecord"
FOR EACH ROW EXECUTE FUNCTION lms_write_audit_trail();

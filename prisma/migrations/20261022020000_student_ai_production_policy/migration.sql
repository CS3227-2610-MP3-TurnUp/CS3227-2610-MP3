-- Each environment has its own database and singleton budget. Preserve all counters.
ALTER TABLE student_ai_budget DROP CONSTRAINT student_ai_budget_environment_check;
ALTER TABLE student_ai_budget ADD CONSTRAINT student_ai_budget_environment_check
  CHECK (environment IN ('preview', 'production'));

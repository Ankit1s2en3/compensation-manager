-- Custom SQL migration file, put your code below! --

-- Make salary_no_overlap DEFERRABLE, but keep it INITIALLY IMMEDIATE: every
-- transaction still gets a per-statement check by default, so a genuine overlap
-- in a raise or in the seed fails at the offending statement, not at COMMIT.
--
-- Only a correction needs the relaxation: it inserts the replacement while the
-- original is still live and sharing its date range, then supersedes the
-- original. That transaction alone issues `SET CONSTRAINTS salary_no_overlap
-- DEFERRED` so the check lands at COMMIT, by which point the original is
-- superseded and the invariant holds. See docs/adr/0007.

ALTER TABLE salary_records DROP CONSTRAINT salary_no_overlap;--> statement-breakpoint

ALTER TABLE salary_records ADD CONSTRAINT salary_no_overlap
  EXCLUDE USING gist (
    employee_id                                   WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (superseded_at IS NULL)
  DEFERRABLE INITIALLY IMMEDIATE;

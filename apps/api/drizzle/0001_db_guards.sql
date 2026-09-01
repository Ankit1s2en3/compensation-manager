-- Custom SQL migration file, put your code below! --

-- Guards that drizzle-kit cannot express: extensions, the immutability trigger
-- (data-model.md §3), the gist exclusion constraint (§3), and the partial /
-- trigram indexes (§8).

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- §3: business facts on a salary record are immutable. effective_to and the
-- superseded_* columns are the permitted updates.
CREATE FUNCTION reject_fact_update() RETURNS trigger AS $$
BEGIN
  IF NEW.amount_minor   IS DISTINCT FROM OLD.amount_minor
  OR NEW.currency_code  IS DISTINCT FROM OLD.currency_code
  OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
  OR NEW.employee_id    IS DISTINCT FROM OLD.employee_id
  OR NEW.change_reason  IS DISTINCT FROM OLD.change_reason THEN
    RAISE EXCEPTION 'salary_records: business facts are immutable (record %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER salary_records_immutable_facts
  BEFORE UPDATE ON salary_records
  FOR EACH ROW EXECUTE FUNCTION reject_fact_update();--> statement-breakpoint

-- §3: no two LIVE periods for one employee may overlap (I1). The WHERE clause
-- lets a superseded row keep sharing dates with its replacement.
ALTER TABLE salary_records ADD CONSTRAINT salary_no_overlap
  EXCLUDE USING gist (
    employee_id                                   WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (superseded_at IS NULL);--> statement-breakpoint

-- §8: hot path — an employee's live, current record.
CREATE INDEX salary_current
  ON salary_records (employee_id, effective_from DESC)
  WHERE superseded_at IS NULL;--> statement-breakpoint

-- §8: aggregation path — the live, open record per employee, covering the
-- comparable base amount so the scan is index-only.
CREATE INDEX salary_live_open
  ON salary_records (employee_id)
  INCLUDE (amount_base_minor)
  WHERE superseded_at IS NULL AND effective_to IS NULL;--> statement-breakpoint

-- §8: fuzzy name search.
CREATE INDEX employees_name_trgm
  ON employees USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

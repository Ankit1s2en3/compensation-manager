CREATE TYPE "public"."change_reason" AS ENUM('HIRE', 'MERIT', 'PROMOTION', 'MARKET_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT');--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"exponent" smallint NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"department_id" integer NOT NULL,
	"job_level_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"hire_date" date NOT NULL,
	"manager_id" integer,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"rate_set_id" integer NOT NULL,
	"currency_code" char(3) NOT NULL,
	"rate_to_base" numeric(18, 8) NOT NULL,
	CONSTRAINT "exchange_rates_rate_set_id_currency_code_pk" PRIMARY KEY("rate_set_id","currency_code")
);
--> statement-breakpoint
CREATE TABLE "fx_rate_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"as_of_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "job_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "salary_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"effective_from" date NOT NULL,
	"change_reason" "change_reason" NOT NULL,
	"note" text,
	"effective_to" date,
	"superseded_at" timestamp with time zone,
	"superseded_by_id" integer,
	"fx_rate_set_id" integer NOT NULL,
	"fx_rate_to_base" numeric(18, 8) NOT NULL,
	"amount_base_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_level_id_job_levels_id_fk" FOREIGN KEY ("job_level_id") REFERENCES "public"."job_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_rate_set_id_fx_rate_sets_id_fk" FOREIGN KEY ("rate_set_id") REFERENCES "public"."fx_rate_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_superseded_by_id_salary_records_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."salary_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_fx_rate_set_id_fx_rate_sets_id_fk" FOREIGN KEY ("fx_rate_set_id") REFERENCES "public"."fx_rate_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_dept" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_country" ON "employees" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "employees_level" ON "employees" USING btree ("job_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_rate_set" ON "fx_rate_sets" USING btree ("is_active") WHERE "fx_rate_sets"."is_active";
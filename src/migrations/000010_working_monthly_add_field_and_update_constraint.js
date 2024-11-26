const up = `
DO $$
BEGIN
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'working_monthly' AND column_name = 'approval_comment_txt')
	THEN

		ALTER TABLE public.working_monthly RENAME COLUMN "is_vacancy" TO "is_vacancy_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_selection_mnemocode" TO "vacancy_selection_mnemocode_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_cost" TO "vacancy_cost_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "job_on_vacancy_id" TO "job_on_vacancy_id_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_description_txt" TO "vacancy_description_txt_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_date_from_utc" TO "vacancy_date_from_utc_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_date_to_utc" TO "vacancy_date_to_utc_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "vacancy_closed_date_utc" TO "vacancy_closed_date_utc_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "working_monthly_vacancy_response_count" TO "working_monthly_vacancy_response_count_bak";
		ALTER TABLE public.working_monthly RENAME COLUMN "working_monthly_vacancy_response_creation_last_date_utc" TO "working_monthly_vacancy_response_creation_last_date_utc_bak";

		ALTER TABLE public.working_monthly DROP CONSTRAINT IF EXISTS wm_job_on_vacancy_id_fk;
		ALTER TABLE public.working_monthly DROP CONSTRAINT IF EXISTS wm_vacancy_selection_chk;

		DROP INDEX IF EXISTS wm_ref_unique_key;

		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "approval_comment_txt" text NOT NULL DEFAULT ''::character varying;

		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "is_vacancy" boolean NULL DEFAULT false;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_selection_mnemocode" varchar(50) NULL DEFAULT ''::character varying;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_cost" numeric(10,3) NULL DEFAULT 0;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "job_on_vacancy_id" bigint NULL;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_description_txt" text NULL DEFAULT ''::character varying;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_date_from_utc" timestamp without time zone NULL;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_date_to_utc" timestamp without time zone NULL;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_closed_date_utc" timestamp without time zone NULL;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "working_monthly_vacancy_response_count" integer NULL;
		ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "working_monthly_vacancy_response_creation_last_date_utc" timestamp without time zone NULL;

		UPDATE public.working_monthly SET
			"is_vacancy" = "is_vacancy_bak",
			"vacancy_selection_mnemocode" = "vacancy_selection_mnemocode_bak",
			"vacancy_cost" = "vacancy_cost_bak",
			"job_on_vacancy_id" = "job_on_vacancy_id_bak",
			"vacancy_description_txt" = "vacancy_description_txt_bak",
			"vacancy_date_from_utc" = "vacancy_date_from_utc_bak",
			"vacancy_date_to_utc" = "vacancy_date_to_utc_bak",
			"vacancy_closed_date_utc" = "vacancy_closed_date_utc_bak",
			"working_monthly_vacancy_response_count" = "working_monthly_vacancy_response_count_bak",
			"working_monthly_vacancy_response_creation_last_date_utc" = "working_monthly_vacancy_response_creation_last_date_utc_bak";

		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "is_vacancy_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_selection_mnemocode_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_cost_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "job_on_vacancy_id_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_description_txt_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_date_from_utc_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_date_to_utc_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_closed_date_utc_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "working_monthly_vacancy_response_count_bak";
		ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "working_monthly_vacancy_response_creation_last_date_utc_bak";

		ALTER TABLE public.working_monthly ALTER COLUMN "is_vacancy" SET NOT NULL;
		ALTER TABLE public.working_monthly ALTER COLUMN "vacancy_selection_mnemocode" SET NOT NULL;
		ALTER TABLE public.working_monthly ALTER COLUMN "vacancy_cost" SET NOT NULL;
		ALTER TABLE public.working_monthly ALTER COLUMN "vacancy_description_txt" SET NOT NULL;
		ALTER TABLE public.working_monthly ALTER COLUMN "working_monthly_vacancy_response_count" SET NOT NULL;
		ALTER TABLE public.working_monthly ALTER COLUMN "working_monthly_vacancy_response_creation_last_date_utc" SET NOT NULL;

		ALTER TABLE public.working_monthly ADD CONSTRAINT wm_job_on_vacancy_id_fk FOREIGN KEY (job_on_vacancy_id) REFERENCES job(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly ADD CONSTRAINT wm_vacancy_selection_chk CHECK (((vacancy_selection_mnemocode)::text = ANY (ARRAY[(''::character varying)::text, ('trading_point_employee'::character varying)::text, ('stakeholder_employee'::character varying)::text, ('outsource'::character varying)::text])));

		CREATE UNIQUE INDEX IF NOT EXISTS wm_ref_unique_key ON public.working_monthly USING btree (month_mnemocode, trading_point_id, usr_acc_employee_id) WHERE (is_vacancy = false);

	END IF;

	ALTER TABLE public.working_monthly DROP CONSTRAINT IF EXISTS wm_approval_status_chk;
	ALTER TABLE public.working_monthly ADD CONSTRAINT wm_approval_status_chk CHECK (((approval_status_mnemocode)::text = ANY (ARRAY[('draft'::character varying)::text, ('rejected'::character varying)::text, ('waiting'::character varying)::text, ('confirmed'::character varying)::text])));

END $$;
`;

const down = `
SELECT 1;
`;
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.raw(up);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.raw(down);
};

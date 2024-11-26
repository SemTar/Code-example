const up = `
DO $$
BEGIN
	
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vacancy' AND column_name = 'timetable_template_last_used_id' )
AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vacancy' AND column_name = 'timetable_template_last_used_date_utc')

THEN

  ALTER TABLE public.vacancy RENAME COLUMN "selection_mnemocode" TO "selection_mnemocode_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "cost" TO "cost_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "job_id" TO "job_id_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "description_txt" TO "description_txt_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "date_from_utc" TO "date_from_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "date_to_utc" TO "date_to_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "closed_date_utc" TO "closed_date_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "response_count" TO "response_count_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "vacancy_working_shift_plan_count" TO "vacancy_working_shift_plan_count_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "approval_status_mnemocode" TO "approval_status_mnemocode_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "approval_status_last_date_utc" TO "approval_status_last_date_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "approval_status_rejected_point_date_utc" TO "approval_status_rejected_point_date_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "approval_status_confirmed_point_date_utc" TO "approval_status_confirmed_point_date_utc_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "usr_acc_last_approval_id" TO "usr_acc_last_approval_id_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "approval_comment_txt" TO "approval_comment_txt_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "shift_details_json" TO "shift_details_json_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "response_waiting_for_supervisor_count" TO "response_waiting_for_supervisor_count_bak";
  ALTER TABLE public.vacancy RENAME COLUMN "response_offer_count" TO "response_offer_count_bak";

  ALTER TABLE public.vacancy DROP CONSTRAINT IF EXISTS v_approval_status_chk;
  ALTER TABLE public.vacancy DROP CONSTRAINT IF EXISTS v_job_id_fk;
  ALTER TABLE public.vacancy DROP CONSTRAINT IF EXISTS v_selection_mnemocode_chk;
  ALTER TABLE public.vacancy DROP CONSTRAINT IF EXISTS v_usr_acc_last_approval_id_fk;


  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "timetable_template_last_used_id" int8 NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "timetable_template_last_used_date_utc" timestamp NULL;


  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "selection_mnemocode" varchar(50) NULL DEFAULT ''::character varying;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "cost" numeric(10,3) NULL DEFAULT 0;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "job_id" bigint NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "description_txt" text NULL DEFAULT ''::character varying;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "date_from_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "date_to_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "closed_date_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "response_count" integer NULL DEFAULT 0;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "vacancy_working_shift_plan_count" integer NULL DEFAULT 0;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "approval_status_mnemocode" varchar(10) NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "approval_status_last_date_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "approval_status_rejected_point_date_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "approval_status_confirmed_point_date_utc" timestamp without time zone NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "usr_acc_last_approval_id" bigint NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "approval_comment_txt" text NULL DEFAULT ''::character varying;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "shift_details_json" jsonb NULL;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "response_waiting_for_supervisor_count" integer NULL DEFAULT 0;
  ALTER TABLE public.vacancy ADD COLUMN IF NOT EXISTS "response_offer_count" integer NULL DEFAULT 0;

  UPDATE public.vacancy SET
    "selection_mnemocode" = "selection_mnemocode_bak",
    "cost" = "cost_bak",
    "job_id" = "job_id_bak",
    "description_txt" = "description_txt_bak",
    "date_from_utc" = "date_from_utc_bak",
    "date_to_utc" = "date_to_utc_bak",
    "closed_date_utc" = "closed_date_utc_bak",
    "response_count" = "response_count_bak",
    "vacancy_working_shift_plan_count" = "vacancy_working_shift_plan_count_bak",
    "approval_status_mnemocode" = "approval_status_mnemocode_bak",
    "approval_status_last_date_utc" = "approval_status_last_date_utc_bak",
    "approval_status_rejected_point_date_utc" = "approval_status_rejected_point_date_utc_bak",
    "approval_status_confirmed_point_date_utc" = "approval_status_confirmed_point_date_utc_bak",
    "usr_acc_last_approval_id" = "usr_acc_last_approval_id_bak",
    "approval_comment_txt" = "approval_comment_txt_bak",
    "shift_details_json" = "shift_details_json_bak",
    "response_waiting_for_supervisor_count" = "response_waiting_for_supervisor_count_bak",
    "response_offer_count" = "response_offer_count_bak";

  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "selection_mnemocode_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "cost_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "job_id_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "description_txt_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "date_from_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "date_to_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "closed_date_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "response_count_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "vacancy_working_shift_plan_count_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "approval_status_mnemocode_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "approval_status_last_date_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "approval_status_rejected_point_date_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "approval_status_confirmed_point_date_utc_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "usr_acc_last_approval_id_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "approval_comment_txt_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "shift_details_json_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "response_waiting_for_supervisor_count_bak";
  ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "response_offer_count_bak";

  ALTER TABLE public.vacancy ALTER COLUMN "selection_mnemocode" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "cost" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "description_txt" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "response_count" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "vacancy_working_shift_plan_count" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "approval_status_mnemocode" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "approval_status_last_date_utc" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "usr_acc_last_approval_id" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "approval_comment_txt" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "response_waiting_for_supervisor_count" SET NOT NULL;
  ALTER TABLE public.vacancy ALTER COLUMN "response_offer_count" SET NOT NULL;

  ALTER TABLE public.vacancy ADD CONSTRAINT v_timetable_template_last_used_id_fk FOREIGN KEY (timetable_template_last_used_id) REFERENCES timetable_template(id) ON DELETE RESTRICT;
  ALTER TABLE public.vacancy ADD CONSTRAINT v_approval_status_chk CHECK (((approval_status_mnemocode)::text = ANY (ARRAY[('draft'::character varying)::text, ('rejected'::character varying)::text, ('waiting'::character varying)::text, ('confirmed'::character varying)::text])));
  ALTER TABLE public.vacancy ADD CONSTRAINT v_job_id_fk FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE RESTRICT;
  ALTER TABLE public.vacancy ADD CONSTRAINT v_selection_mnemocode_chk CHECK (((selection_mnemocode)::text = ANY (ARRAY[(''::character varying)::text, ('trading_point_employee'::character varying)::text, ('stakeholder_employee'::character varying)::text, ('outsource'::character varying)::text])));
  ALTER TABLE public.vacancy ADD CONSTRAINT v_usr_acc_last_approval_id_fk FOREIGN KEY (usr_acc_last_approval_id) REFERENCES usr_acc(id) ON DELETE RESTRICT;


END IF;

END $$;
`;

const down = `
DO $$
BEGIN

  	ALTER TABLE public.vacancy DROP CONSTRAINT IF EXISTS "v_timetable_template_last_used_id_fk";  
    ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "timetable_template_last_used_id";
    ALTER TABLE public.vacancy DROP COLUMN IF EXISTS "timetable_template_last_used_date_utc";

END $$;
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


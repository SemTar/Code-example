const up = `
DO $$
BEGIN

IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'working_shift_fact_event_history' AND column_name = 'working_monthly_id')
THEN

  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "working_shift_fact_id" TO "working_shift_fact_id_bak";
  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "method_name" TO "method_name_bak";
  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "is_new_record" TO "is_new_record_bak";
  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "platform_mnemocode" TO "platform_mnemocode_bak";
  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "edit_body_json" TO "edit_body_json_bak";
  ALTER TABLE public.working_shift_fact_event_history RENAME COLUMN "date_history_utc" TO "date_history_utc_bak";

  ALTER TABLE public.working_shift_fact_event_history DROP CONSTRAINT IF EXISTS wsfeh_working_shift_fact_id_fk;


  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "working_monthly_id" int8 NULL;

  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "working_shift_fact_id" bigint NULL;
  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "method_name" varchar(255) NULL DEFAULT ''::character varying;
  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "is_new_record" boolean NULL DEFAULT false;
  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "platform_mnemocode" varchar(50) NULL DEFAULT ''::character varying;
  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "edit_body_json" jsonb NULL;
  ALTER TABLE public.working_shift_fact_event_history ADD COLUMN IF NOT EXISTS "date_history_utc" timestamp without time zone NULL;

  UPDATE public.working_shift_fact_event_history SET
    "working_shift_fact_id" = "working_shift_fact_id_bak",
    "method_name" = "method_name_bak",
    "is_new_record" = "is_new_record_bak",
    "platform_mnemocode" = "platform_mnemocode_bak",
    "edit_body_json" = "edit_body_json_bak",
    "date_history_utc" = "date_history_utc_bak";

  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "working_shift_fact_id_bak";
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "method_name_bak";
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "is_new_record_bak";
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "platform_mnemocode_bak";
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "edit_body_json_bak";
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS "date_history_utc_bak";

  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "working_shift_fact_id" SET NOT NULL;
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "method_name" SET NOT NULL;
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "is_new_record" SET NOT NULL;
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "platform_mnemocode" SET NOT NULL;
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "edit_body_json" SET NOT NULL;
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "date_history_utc" SET NOT NULL;

  ALTER TABLE public.working_shift_fact_event_history ADD CONSTRAINT wsfeh_working_shift_fact_id_fk FOREIGN KEY (working_shift_fact_id) REFERENCES working_shift_fact(id) ON DELETE RESTRICT;
  ALTER TABLE public.working_shift_fact_event_history ADD CONSTRAINT wsfeh_working_monthly_id_fk FOREIGN KEY (working_monthly_id) REFERENCES working_monthly(id) ON DELETE RESTRICT;

  UPDATE public.working_shift_fact_event_history SET working_monthly_id = chk.working_monthly_id
  FROM public.working_shift_fact AS chk
  WHERE 
    public.working_shift_fact_event_history.working_monthly_id IS NULL
    AND public.working_shift_fact_event_history.working_shift_fact_id = chk.id;
  
  ALTER TABLE public.working_shift_fact_event_history ALTER COLUMN "working_monthly_id" SET NOT NULL;

END IF;

IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'working_shift_plan_event_history' AND column_name = 'working_monthly_id')
THEN

  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "working_shift_plan_id" TO "working_shift_plan_id_bak";
  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "method_name" TO "method_name_bak";
  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "is_new_record" TO "is_new_record_bak";
  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "platform_mnemocode" TO "platform_mnemocode_bak";
  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "edit_body_json" TO "edit_body_json_bak";
  ALTER TABLE public.working_shift_plan_event_history RENAME COLUMN "date_history_utc" TO "date_history_utc_bak";

  ALTER TABLE public.working_shift_plan_event_history DROP CONSTRAINT IF EXISTS wspeh_working_shift_plan_id_fk;


  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "working_monthly_id" int8 NULL;

  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "working_shift_plan_id" bigint NULL;
  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "method_name" varchar(255) NULL DEFAULT ''::character varying;
  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "is_new_record" boolean NULL DEFAULT false;
  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "platform_mnemocode" varchar(50) NULL DEFAULT ''::character varying;
  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "edit_body_json" jsonb NULL;
  ALTER TABLE public.working_shift_plan_event_history ADD COLUMN IF NOT EXISTS "date_history_utc" timestamp without time zone NULL;

  UPDATE public.working_shift_plan_event_history SET
    "working_shift_plan_id" = "working_shift_plan_id_bak",
    "method_name" = "method_name_bak",
    "is_new_record" = "is_new_record_bak",
    "platform_mnemocode" = "platform_mnemocode_bak",
    "edit_body_json" = "edit_body_json_bak",
    "date_history_utc" = "date_history_utc_bak";

  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "working_shift_plan_id_bak";
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "method_name_bak";
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "is_new_record_bak";
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "platform_mnemocode_bak";
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "edit_body_json_bak";
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS "date_history_utc_bak";

  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "working_shift_plan_id" SET NOT NULL;
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "method_name" SET NOT NULL;
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "is_new_record" SET NOT NULL;
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "platform_mnemocode" SET NOT NULL;
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "edit_body_json" SET NOT NULL;
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "date_history_utc" SET NOT NULL;

  ALTER TABLE public.working_shift_plan_event_history ADD CONSTRAINT wspeh_working_shift_plan_id_fk FOREIGN KEY (working_shift_plan_id) REFERENCES working_shift_plan(id) ON DELETE RESTRICT;
  ALTER TABLE public.working_shift_plan_event_history ADD CONSTRAINT wspeh_working_monthly_id_fk FOREIGN KEY (working_monthly_id) REFERENCES working_monthly(id) ON DELETE RESTRICT;

  UPDATE public.working_shift_plan_event_history SET working_monthly_id = chk.working_monthly_id
  FROM public.working_shift_plan AS chk
  WHERE 
    public.working_shift_plan_event_history.working_monthly_id IS NULL
    AND public.working_shift_plan_event_history.working_shift_plan_id = chk.id;
  
  ALTER TABLE public.working_shift_plan_event_history ALTER COLUMN "working_monthly_id" SET NOT NULL;

END IF;

END $$;
`;

const down = `
DO $$
BEGIN
  ALTER TABLE public.working_shift_fact_event_history DROP CONSTRAINT IF EXISTS wsfeh_working_monthly_id_fk;
  ALTER TABLE public.working_shift_fact_event_history DROP COLUMN IF EXISTS working_monthly_id;

  ALTER TABLE public.working_shift_plan_event_history DROP CONSTRAINT IF EXISTS wspeh_working_monthly_id_fk;
  ALTER TABLE public.working_shift_plan_event_history DROP COLUMN IF EXISTS working_monthly_id;
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

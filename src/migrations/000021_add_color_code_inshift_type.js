const up = `
DO $$
BEGIN

	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shift_type' AND column_name = 'color_code')
	THEN
	
	  ALTER TABLE public.shift_type RENAME COLUMN "is_working_shift" TO "is_working_shift_bak";
	  ALTER TABLE public.shift_type RENAME COLUMN "date_blocked_utc" TO "date_blocked_utc_bak";
	  ALTER TABLE public.shift_type RENAME COLUMN "order_on_stakeholder" TO "order_on_stakeholder_bak";
	
	
	
	  ALTER TABLE public.shift_type ADD COLUMN IF NOT EXISTS "color_code" varchar(10) NOT NULL DEFAULT '#FFFFFF'::character varying;
	
	  ALTER TABLE public.shift_type ADD COLUMN IF NOT EXISTS "is_working_shift" boolean NULL DEFAULT true;
	  ALTER TABLE public.shift_type ADD COLUMN IF NOT EXISTS "date_blocked_utc" timestamp without time zone NULL;
	  ALTER TABLE public.shift_type ADD COLUMN IF NOT EXISTS "order_on_stakeholder" integer NULL;
	
	  UPDATE public.shift_type SET
	    "is_working_shift" = "is_working_shift_bak",
	    "date_blocked_utc" = "date_blocked_utc_bak",
	    "order_on_stakeholder" = "order_on_stakeholder_bak";
	
	  ALTER TABLE public.shift_type DROP COLUMN IF EXISTS "is_working_shift_bak";
	  ALTER TABLE public.shift_type DROP COLUMN IF EXISTS "date_blocked_utc_bak";
	  ALTER TABLE public.shift_type DROP COLUMN IF EXISTS "order_on_stakeholder_bak";
	
	  ALTER TABLE public.shift_type ALTER COLUMN "is_working_shift" SET NOT NULL;
	  ALTER TABLE public.shift_type ALTER COLUMN "order_on_stakeholder" SET NOT NULL;
	
	 END IF;
	
END $$;
`;

const down = `
ALTER TABLE public.shift_type DROP COLUMN IF EXISTS "color_code";
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

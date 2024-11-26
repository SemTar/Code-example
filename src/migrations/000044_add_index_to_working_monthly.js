const up = `
DO $$
DECLARE
  working_monthly_ids INTEGER[];
BEGIN
	SELECT ARRAY(
		SELECT id FROM (
			(SELECT id FROM public.working_monthly WHERE usr_acc_employee_id IS NULL) UNION 
			(SELECT id FROM 
				(SELECT id, ROW_NUMBER() OVER 
					(PARTITION BY month_mnemocode, trading_point_id, usr_acc_employee_id ORDER BY id) AS row_num 
				FROM public.working_monthly
				WHERE usr_acc_employee_id IS NOT NULL) AS duplicates 
			WHERE row_num > 1)
		)  AS combined_ids
	) INTO working_monthly_ids;

	DELETE FROM public.working_shift_fact_event_history WHERE working_monthly_id IN (SELECT UNNEST(working_monthly_ids));
	DELETE FROM public.working_shift_plan_event_history WHERE working_monthly_id IN (SELECT UNNEST(working_monthly_ids));
	DELETE FROM public.working_monthly_event_history  WHERE working_monthly_id IN (SELECT UNNEST(working_monthly_ids));

	DELETE FROM public.working_shift_fact WHERE working_monthly_id IN (SELECT UNNEST(working_monthly_ids));
	DELETE FROM public.working_shift_plan WHERE working_monthly_id IN (SELECT UNNEST(working_monthly_ids));
	DELETE FROM public.working_monthly  WHERE id IN (SELECT UNNEST(working_monthly_ids));
		
	ALTER TABLE public.working_monthly ALTER COLUMN usr_acc_employee_id SET NOT NULL;
	
	CREATE UNIQUE INDEX IF NOT EXISTS wm_ref_unique_key ON public.working_monthly 
	USING btree (month_mnemocode, trading_point_id, usr_acc_employee_id);

END $$;
`;

const down = `
DO $$
BEGIN

  DROP INDEX IF EXISTS wm_ref_unique_key;
  ALTER TABLE public.working_monthly ALTER COLUMN usr_acc_employee_id DROP NOT NULL;

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

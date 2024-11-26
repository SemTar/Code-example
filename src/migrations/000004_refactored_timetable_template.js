const up = `
DO $$
	BEGIN
		ALTER TABLE public.timetable_template ADD COLUMN IF NOT EXISTS days_on_off_length int4 NULL;
		ALTER TABLE public.timetable_template ALTER COLUMN apply_type_mnemocode TYPE varchar(20);
		ALTER TABLE public.timetable_template_cell ALTER COLUMN day_info_mnemocode TYPE varchar(20);
	END 
$$
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

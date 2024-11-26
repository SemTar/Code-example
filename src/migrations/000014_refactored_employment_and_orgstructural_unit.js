const up = `
DO $$
BEGIN
	ALTER TABLE public.employment
	ALTER COLUMN working_date_from_wall TYPE timestamp,
	ALTER COLUMN working_date_to_wall TYPE timestamp;

	UPDATE public.orgstructural_unit
	SET time_zone_id = 1
	WHERE time_zone_id IS NULL;

	ALTER TABLE public.orgstructural_unit
	ALTER COLUMN time_zone_id SET NOT NULL;
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

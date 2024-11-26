const up = `
DO $$
BEGIN

ALTER TABLE public.working_shift_fact ALTER COLUMN work_date_from_utc DROP NOT NULL;

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

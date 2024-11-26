const up = `
ALTER TABLE public.working_identification_attempt_files_identification 
ADD COLUMN IF NOT EXISTS "is_suspected_fake" boolean NOT NULL DEFAULT true;
`;

const down = `
ALTER TABLE public.working_identification_attempt_files_identification DROP COLUMN IF EXISTS "is_suspected_fake";
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

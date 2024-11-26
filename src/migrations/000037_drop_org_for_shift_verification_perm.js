const up = `
DO $$
BEGIN

  UPDATE public.stakeholder_role_permission 
  SET role_permission_id = 
    (SELECT id FROM public.role_permission WHERE mnemocode = 'org_for_working_identification_attempt') 
  WHERE role_permission_id = 
    (SELECT id FROM public.role_permission WHERE mnemocode = 'org_for_shift_verification');

  DELETE FROM public.role_permission WHERE mnemocode = 'org_for_shift_verification';

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

const up = `
DO $$
BEGIN

CREATE OR REPLACE FUNCTION public.fn_datetime_intersected(first_from timestamp without time zone, first_to timestamp without time zone, second_from timestamp without time zone, second_to timestamp without time zone)
  RETURNS boolean
  LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN 
    (first_from IS NULL OR first_to IS NULL OR first_from <= first_to)
    AND
    (second_from IS NULL OR second_to IS NULL OR second_from <= second_to)
    AND
    (first_from IS NULL OR second_to IS NULL OR first_from <= second_to)
    AND
    (first_to IS NULL OR second_from IS NULL OR first_to >= second_from);
END;
$function$
;

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

const up = `
DO $$
	BEGIN
		CREATE TABLE employment_temp AS
		SELECT
		CASE
			WHEN trading_point_id IS NOT NULL AND orgstructural_unit_id IS NULL THEN 'trading_point'
			WHEN trading_point_id IS NULL AND orgstructural_unit_id IS NOT NULL THEN 'orgstructural_unit'
			ELSE NULL
		END AS orgstructural_type_mnemocode_temp,
		id
		FROM employment;
		
		ALTER TABLE employment
		ALTER COLUMN orgstructural_type_mnemocode TYPE varchar(100);
		
		UPDATE employment
		SET orgstructural_type_mnemocode = orgstructural_type_mnemocode_temp
		FROM employment_temp
		WHERE employment.id = employment_temp.id;
		
		DROP TABLE employment_temp;
	END 
$$
`;

const down = `
DO $$
	BEGIN

		UPDATE employment
		SET orgstructural_type_mnemocode = null;

		ALTER TABLE employment
		ALTER COLUMN orgstructural_type_mnemocode TYPE int8
		USING orgstructural_type_mnemocode::bigint;

	END 
$$
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

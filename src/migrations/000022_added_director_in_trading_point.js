const up = `
DO $$
BEGIN
    ALTER TABLE public.trading_point DROP CONSTRAINT IF EXISTS tp_usr_acc_director_id_fk;
    ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS usr_acc_director_id int8 NULL;
    ALTER TABLE public.trading_point ADD CONSTRAINT tp_usr_acc_director_id_fk FOREIGN KEY (usr_acc_director_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
END $$;
`;

const down = `
DO $$
BEGIN
	ALTER TABLE public.trading_point DROP CONSTRAINT IF EXISTS tp_usr_acc_director_id_fk;
	ALTER TABLE public.trading_point DROP COLUMN IF EXISTS usr_acc_director_id;
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

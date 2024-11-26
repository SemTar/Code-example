const up = `
DO $$
BEGIN
UPDATE public.role_permission
SET 
  name = 'Доступ к редактированию данных у ВСЕХ пользователей, кроме фотографий для идентификации'
WHERE
  mnemocode = 'global_for_usr_acc_general';
--

UPDATE public.sys_option
SET 
  name = 'Максимально возможное количество уже выпущенных активных кодов авторизации'
WHERE
  code = 'SPAM_LIMIT_ISSUED_AUTH_CODES_COUNT';

UPDATE public.sys_option
SET 
  name = 'Максимально возможное количество попыток неправильно ввести код авторизации'
WHERE
  code = 'SPAM_LIMIT_AUTH_CODE_SUBMIT_COUNT';
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

const up = `
DO $$
BEGIN
  ALTER TABLE public.role_permission ADD COLUMN IF NOT EXISTS order_on_list int4 DEFAULT 0 NOT NULL;
  ALTER TABLE public.role_permission ADD COLUMN IF NOT EXISTS group_mnemocode varchar(50) DEFAULT 'other' NOT NULL;
--


  UPDATE role_permission
    SET
    name = 'Доступ к редактированию оргструктурных единиц',
    order_on_list = 1,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'global_for_orgstructural_unit';

  UPDATE role_permission
    SET
    name = 'Доступ к редактированию должностей',
    order_on_list = 2,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'global_for_job';
  
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию трудоустройств',
    order_on_list = 3,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'org_for_employment';
  
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию родов занятий',
    order_on_list = 4,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'global_for_workline';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию видов смен',
    order_on_list = 5,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'global_for_shift_type';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию ролей',
    order_on_list = 6,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'global_for_stakeholder_role';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию торговых точек',
    order_on_list = 7,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'org_for_trading_point';
      
  UPDATE role_permission
    SET
    name = 'Доступ к SSL-сертификатам торговых точек',
    order_on_list = 8,
    group_mnemocode = 'stakeholder_data_managment'
    WHERE mnemocode = 'org_for_trading_point_ssl_certificate';
        
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию данных пользователей в пределах оргструктурной единицы или торговой точки',
    order_on_list = 9,
    group_mnemocode = 'user_managment'
    WHERE mnemocode = 'org_for_usr_acc_general';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию фотографий для идентификации пользователей в пределах оргструктурной единицы или торговой точки',
    order_on_list = 10,
    group_mnemocode = 'user_managment'
    WHERE mnemocode = 'org_for_usr_acc_files_identification';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию данных пользователей в пределах всей организации',
    order_on_list = 11,
    group_mnemocode = 'user_managment'
    WHERE mnemocode = 'global_for_usr_acc_general';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию фотографий для идентификации пользователей в пределах всей организации',
    order_on_list = 12,
    group_mnemocode = 'user_managment'
    WHERE mnemocode = 'global_for_usr_acc_files_identification';
    
  UPDATE role_permission
    SET
    name = 'Доступ к просмотру графика в режиме чтения',
    order_on_list = 13,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_shift_read_only';
    
  UPDATE role_permission
    SET
    name = 'Доступ к просмотру вакантного графика в режиме чтения',
    order_on_list = 14,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_vacancy_read_only';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию планового графика для заданного списка должностей',
    order_on_list = 15,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_shift_plan_edit';
    
  UPDATE role_permission
    SET
    name = 'Доступ к редактированию фактического графика для заданного списка должностей',
    order_on_list = 16,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_shift_fact_edit';
    
  UPDATE role_permission
    SET
    name = 'Доступ к созданию вакантной плановой смены для заданного списка должностей',
    order_on_list = 17,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_vacancy_publication';
    
  UPDATE role_permission
    SET
    name = 'Доступ к согласованию графика для заданного списка должностей',
    order_on_list = 18,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_working_approval_status';
    
  UPDATE role_permission
    SET
    name = 'Доступ к согласованию вакантного графика для заданного списка должностей',
    order_on_list = 19,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_job_for_vacancy_approval_status';
    
  UPDATE role_permission
    SET
    name = 'Доступ к проверке достоверности смен при идентификации',
    order_on_list = 20,
    group_mnemocode = 'calendar_managment'
    WHERE mnemocode = 'org_for_working_identification_attempt';
    
  UPDATE role_permission
    SET
    name = 'Доступ к созданию собственных фактических смен (минимальный набор доступов*)',
    order_on_list = 21,
    group_mnemocode = 'calendar_mob_managment'
    WHERE mnemocode = 'org_for_creating_own_shifts';
    
  UPDATE role_permission
    SET
    name = 'Доступ к использованию биржи смен (минимальный набор доступов*)',
    order_on_list = 22,
    group_mnemocode = 'calendar_mob_managment'
    WHERE mnemocode = 'org_for_usage_shift_exchange';
END $$;
`;

const down = `
DO $$
BEGIN
  ALTER TABLE public.role_permission DROP COLUMN IF EXISTS order_on_list;
  ALTER TABLE public.role_permission DROP COLUMN IF EXISTS group_mnemocode;
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

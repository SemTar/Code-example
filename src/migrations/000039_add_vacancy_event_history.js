const up = `
DO $$
BEGIN
CREATE TABLE IF NOT EXISTS public.vacancy_working_shift_plan_event_history (
  id bigserial NOT NULL,
  guid uuid NOT NULL DEFAULT uuid_in(md5(random()::text || now()::text)::cstring),
  date_creation timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
  date_changes timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
  date_deleted timestamp NULL,
  usr_acc_creation_id int8 NULL,
  usr_acc_changes_id int8 NULL,
  vacancy_working_shift_plan_id int8 NOT NULL,
  method_name varchar(255) NOT NULL DEFAULT ''::character varying,
  is_new_record bool NOT NULL DEFAULT false,
  platform_mnemocode varchar(50) NOT NULL DEFAULT ''::character varying,
  edit_body_json jsonb NOT NULL,
  date_history_utc timestamp NOT NULL,
  CONSTRAINT vwspeh_guid_unique_key UNIQUE (guid),
  CONSTRAINT vwspeh_pkey PRIMARY KEY (id),
  CONSTRAINT vwspeh_vacancy_working_shift_plan_id_fk FOREIGN KEY (vacancy_working_shift_plan_id) REFERENCES public.vacancy_working_shift_plan(id) ON DELETE RESTRICT,
  CONSTRAINT vwspeh_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
  CONSTRAINT vwspeh_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT
);

INSERT INTO table_data("name", short, caption, info_txt, is_file_table, is_ready)
SELECT tmp.name, tmp.short, tmp.caption, tmp.info_txt, tmp.is_file_table, tmp.is_ready
FROM 
(
  SELECT
    'vacancy_working_shift_plan_event_history' AS name,
    'Записи в историю изменений вакантных плановых смен' as caption,
    '' AS info_txt,
    'vwspeh' AS short,
    false AS is_file_table,
    true AS is_ready
) AS tmp
WHERE NOT EXISTS(SELECT 1 FROM table_data tbld WHERE tbld.name = tmp.name);
--


CREATE TABLE IF NOT EXISTS public.vacancy_event_history (
  id bigserial NOT NULL,
  guid uuid NOT NULL DEFAULT uuid_in(md5(random()::text || now()::text)::cstring),
  date_creation timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
  date_changes timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
  date_deleted timestamp NULL,
  usr_acc_creation_id int8 NULL,
  usr_acc_changes_id int8 NULL,
  vacancy_id int8 NOT NULL,
  method_name varchar(255) NOT NULL DEFAULT ''::character varying,
  is_new_record bool NOT NULL DEFAULT false,
  platform_mnemocode varchar(50) NOT NULL DEFAULT ''::character varying,
  edit_body_json jsonb NOT NULL,
  date_history_utc timestamp NOT NULL,
  CONSTRAINT veh_guid_unique_key UNIQUE (guid),
  CONSTRAINT veh_pkey PRIMARY KEY (id),
  CONSTRAINT veh_vacancy_id_fk FOREIGN KEY (vacancy_id) REFERENCES public.vacancy(id) ON DELETE RESTRICT,
  CONSTRAINT veh_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
  CONSTRAINT veh_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT
);

INSERT INTO table_data("name", short, caption, info_txt, is_file_table, is_ready)
SELECT tmp.name, tmp.short, tmp.caption, tmp.info_txt, tmp.is_file_table, tmp.is_ready
FROM 
(
  SELECT
    'vacancy_event_history' AS name,
    'Записи в историю изменений вакантных таймлайнов работ' as caption,
    '' AS info_txt,
    'veh' AS short,
    false AS is_file_table,
    true AS is_ready
) AS tmp
WHERE NOT EXISTS(SELECT 1 FROM table_data tbld WHERE tbld.name = tmp.name);
END $$;
`;

const down = `
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancy_event_history' and table_schema = 'public')
  THEN

    ALTER TABLE public.vacancy_event_history DROP CONSTRAINT veh_guid_unique_key;
    ALTER TABLE public.vacancy_event_history DROP CONSTRAINT veh_pkey;
    ALTER TABLE public.vacancy_event_history DROP CONSTRAINT veh_vacancy_id_fk;
    ALTER TABLE public.vacancy_event_history DROP CONSTRAINT veh_usr_acc_changes_id_fk;
    ALTER TABLE public.vacancy_event_history DROP CONSTRAINT veh_usr_acc_creation_id_fk;

    CALL fn_rename_table_to_backup('public.vacancy_event_history'); 
  END IF;
--


  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancy_working_shift_plan_event_history' and table_schema = 'public')
  THEN

    ALTER TABLE public.vacancy_working_shift_plan_event_history DROP CONSTRAINT vwspeh_guid_unique_key;
    ALTER TABLE public.vacancy_working_shift_plan_event_history DROP CONSTRAINT vwspeh_pkey;
    ALTER TABLE public.vacancy_working_shift_plan_event_history DROP CONSTRAINT vwspeh_vacancy_working_shift_plan_id_fk;
    ALTER TABLE public.vacancy_working_shift_plan_event_history DROP CONSTRAINT vwspeh_usr_acc_changes_id_fk;
    ALTER TABLE public.vacancy_working_shift_plan_event_history DROP CONSTRAINT vwspeh_usr_acc_creation_id_fk;

    CALL fn_rename_table_to_backup('public.vacancy_working_shift_plan_event_history'); 
  END IF;


  DELETE FROM public.table_data WHERE name IN (
    'vacancy_working_shift_plan_event_history',
    'vacancy_event_history'
  );
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

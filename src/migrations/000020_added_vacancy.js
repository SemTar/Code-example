const up = `
DO $$
BEGIN

	CREATE TABLE IF NOT EXISTS public.vacancy (
	  id bigserial NOT NULL,
	  guid uuid NOT NULL DEFAULT uuid_in(md5(random()::text || now()::text)::cstring),
	  date_creation timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
	  date_changes timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
	  date_deleted timestamp NULL,
	  usr_acc_creation_id int8 NULL,
	  usr_acc_changes_id int8 NULL,
	  trading_point_id int8 NOT NULL,
	  selection_mnemocode varchar(50) NOT NULL DEFAULT ''::character varying,
	  cost numeric(10, 3) NOT NULL DEFAULT 0,
	  job_id int8 NULL,
	  description_txt text NOT NULL DEFAULT ''::character varying,
	  date_from_utc timestamp NULL,
	  date_to_utc timestamp NULL,
	  closed_date_utc timestamp NULL,
	  response_count int4 NOT NULL DEFAULT 0,
	  vacancy_working_sift_plan_count int4 NOT NULL DEFAULT 0,
	  approval_status_mnemocode varchar(10) NOT NULL,
	  approval_status_last_date_utc timestamp NOT NULL,
	  usr_acc_last_approval_id int8 NOT NULL,
	  CONSTRAINT v_guid_unique_key UNIQUE (guid),
	  CONSTRAINT v_pkey PRIMARY KEY (id),
	  CONSTRAINT v_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
	  CONSTRAINT v_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
	  CONSTRAINT v_trading_point_id_fk FOREIGN KEY (trading_point_id) REFERENCES public.trading_point(id) ON DELETE RESTRICT,
	  CONSTRAINT v_selection_mnemocode_chk CHECK (((selection_mnemocode)::text = ANY(ARRAY[(''::character varying)::text,('trading_point_employee'::character varying)::text,('stakeholder_employee'::character varying)::text,('outsource'::character varying)::text]))),
	  CONSTRAINT v_job_id_fk FOREIGN KEY (job_id) REFERENCES public.job(id) ON DELETE RESTRICT,
	  CONSTRAINT v_approval_status_chk CHECK (((approval_status_mnemocode)::text = ANY (ARRAY[('draft'::character varying)::text, ('rejected'::character varying)::text, ('waiting'::character varying)::text, ('confirmed'::character varying)::text])))
	);

	INSERT INTO table_data("name", short, caption, info_txt, is_file_table, is_ready)
	SELECT tmp.name, tmp.short, tmp.caption, tmp.info_txt, tmp.is_file_table, tmp.is_ready
	FROM 
	(
	  SELECT
	    'vacancy' AS name,
	    'Вакантные таймлайны работ' as caption,
	    '' AS info_txt,
	    'v' AS short,
	    false AS is_file_table,
	    true AS is_ready
	) AS tmp
	WHERE NOT EXISTS(SELECT 1 FROM table_data tbld WHERE tbld.name = tmp.name);
--


	CREATE TABLE IF NOT EXISTS public.vacancy_working_shift_plan (
	  id bigserial NOT NULL,
	  guid uuid NOT NULL DEFAULT uuid_in(md5(random()::text || now()::text)::cstring),
	  date_creation timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
	  date_changes timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
	  date_deleted timestamp NULL,
	  usr_acc_creation_id int8 NULL,
	  usr_acc_changes_id int8 NULL,
	  vacancy_id int8 NOT NULL,
	  work_date_from_utc timestamp NOT NULL,
	  work_date_to_utc timestamp NOT NULL,
	  shift_type_id int8 NOT NULL,
	  workline_id int8 NULL,
	  timetable_template_base_id int8 NULL,
	  CONSTRAINT vwsp_guid_unique_key UNIQUE (guid),
	  CONSTRAINT vwsp_pkey PRIMARY KEY (id),
	  CONSTRAINT vwsp_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
	  CONSTRAINT vwsp_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT,
	  CONSTRAINT vwsp_vacancy_id_fk FOREIGN KEY (vacancy_id) REFERENCES public.vacancy(id) ON DELETE RESTRICT,
	  CONSTRAINT vwsp_shift_type_id_fk FOREIGN KEY (shift_type_id) REFERENCES public.shift_type(id) ON DELETE RESTRICT,
	  CONSTRAINT vwsp_workline_id_fk FOREIGN KEY (workline_id) REFERENCES public.workline(id) ON DELETE RESTRICT,
	  CONSTRAINT vwsp_timetable_template_base_id_fk FOREIGN KEY (timetable_template_base_id) REFERENCES public.timetable_template(id) ON DELETE RESTRICT
	);
	
	INSERT INTO table_data("name", short, caption, info_txt, is_file_table, is_ready)
	SELECT tmp.name, tmp.short, tmp.caption, tmp.info_txt, tmp.is_file_table, tmp.is_ready
	FROM 
	(
	  SELECT
	    'vacancy_working_shift_plan' AS name,
	    'Вакантные плановые смены' as caption,
	    '' AS info_txt,
	    'vwsp' AS short,
	    false AS is_file_table,
	    true AS is_ready
	) AS tmp
	WHERE NOT EXISTS(SELECT 1 FROM table_data tbld WHERE tbld.name = tmp.name);
--
	

	ALTER TABLE public.working_monthly DROP CONSTRAINT IF EXISTS wm_vacancy_selection_chk;

	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "is_vacancy";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_selection_mnemocode";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_cost";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "job_on_vacancy_id";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_description_txt";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_date_from_utc";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_date_to_utc";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_closed_date_utc";
	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "working_monthly_vacancy_response_count";

	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_id" int8 NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'working_monthly' AND constraint_name = 'wm_vacancy_id_fk'
	) THEN
		ALTER TABLE public.working_monthly ADD CONSTRAINT wm_vacancy_id_fk FOREIGN KEY (vacancy_id) REFERENCES public.vacancy(id) ON DELETE RESTRICT;
	END IF;
--


	IF EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'working_monthly_vacancy_response'
	) THEN
		ALTER TABLE public.working_monthly_vacancy_response RENAME TO vacancy_response;
	
		UPDATE table_data
		SET name = 'vacancy_response',
    		short = 'vr'
		WHERE name = 'working_monthly_vacancy_response';
	
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_guid_unique_key;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_pkey CASCADE;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_usr_acc_changes_id_fk;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_usr_acc_creation_id_fk;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_working_monthly_id_fk;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_usr_acc_candidate_id_fk;
		ALTER TABLE public.vacancy_response DROP CONSTRAINT IF EXISTS wmvr_usr_acc_last_candidate_state_id_fk;

		ALTER TABLE public.vacancy_response RENAME COLUMN working_monthly_id TO vacancy_id;

		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_guid_unique_key UNIQUE (guid);
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_pkey PRIMARY KEY (id);
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_vacancy_id_fk FOREIGN KEY (vacancy_id) REFERENCES public.vacancy(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_usr_acc_candidate_id_fk FOREIGN KEY (usr_acc_candidate_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response ADD CONSTRAINT vr_usr_acc_last_candidate_state_id_fk FOREIGN KEY (usr_acc_last_candidate_state_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'working_monthly_vacancy_response_event_history'
	) THEN
		ALTER TABLE working_monthly_vacancy_response_event_history RENAME TO vacancy_response_event_history;
	
		UPDATE table_data
		SET name = 'vacancy_response_event_history',
    		short = 'vreh'
		WHERE name = 'working_monthly_vacancy_response_event_history';
	
		ALTER TABLE public.vacancy_response_event_history DROP CONSTRAINT IF EXISTS wmvreh_guid_unique_key;
		ALTER TABLE public.vacancy_response_event_history DROP CONSTRAINT IF EXISTS wmvreh_pkey;
		ALTER TABLE public.vacancy_response_event_history DROP CONSTRAINT IF EXISTS wmvreh_working_monthly_vacancy_response_id_fk;
		ALTER TABLE public.vacancy_response_event_history DROP CONSTRAINT IF EXISTS wmvreh_usr_acc_changes_id_fk;
		ALTER TABLE public.vacancy_response_event_history DROP CONSTRAINT IF EXISTS wmvreh_usr_acc_creation_id_fk;
	
		ALTER TABLE public.vacancy_response_event_history RENAME COLUMN working_monthly_vacancy_response_id TO vacancy_response_id;		
	
		ALTER TABLE public.vacancy_response_event_history ADD CONSTRAINT vreh_guid_unique_key UNIQUE (guid);
		ALTER TABLE public.vacancy_response_event_history ADD CONSTRAINT vreh_pkey PRIMARY KEY (id);
		ALTER TABLE public.vacancy_response_event_history ADD CONSTRAINT vreh_vacancy_response_id_fk FOREIGN KEY (vacancy_response_id) REFERENCES public.vacancy_response(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response_event_history ADD CONSTRAINT vreh_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.vacancy_response_event_history ADD CONSTRAINT vreh_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
	END IF;
--

END $$;
`;

const down = `
DO $$
BEGIN

	IF EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'vacancy_response'
	) THEN
		ALTER TABLE public.vacancy_response RENAME TO working_monthly_vacancy_response;
	
		UPDATE table_data
		SET name = 'working_monthly_vacancy_response',
    		short = 'wmvr'
		WHERE name = 'vacancy_response';
	
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_guid_unique_key;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_pkey CASCADE;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_usr_acc_changes_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_usr_acc_creation_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_vacancy_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_usr_acc_candidate_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response DROP CONSTRAINT IF EXISTS vr_usr_acc_last_candidate_state_id_fk;
	
		ALTER TABLE public.working_monthly_vacancy_response RENAME COLUMN vacancy_id TO working_monthly_id ;
	
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_guid_unique_key UNIQUE (guid);
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_pkey PRIMARY KEY (id);
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_working_monthly_id_fk FOREIGN KEY (working_monthly_id) REFERENCES public.working_monthly(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_usr_acc_candidate_id_fk FOREIGN KEY (usr_acc_candidate_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response ADD CONSTRAINT wmvr_usr_acc_last_candidate_state_id_fk FOREIGN KEY (usr_acc_last_candidate_state_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'vacancy_response_event_history'
	) THEN
		ALTER TABLE vacancy_response_event_history RENAME TO working_monthly_vacancy_response_event_history;
	
		UPDATE table_data
		SET name = 'working_monthly_vacancy_response_event_history',
    		short = 'wmvreh'
		WHERE name = 'vacancy_response_event_history';
	
		ALTER TABLE public.working_monthly_vacancy_response_event_history DROP CONSTRAINT IF EXISTS vreh_guid_unique_key;
		ALTER TABLE public.working_monthly_vacancy_response_event_history DROP CONSTRAINT IF EXISTS vreh_pkey;
		ALTER TABLE public.working_monthly_vacancy_response_event_history DROP CONSTRAINT IF EXISTS vreh_vacancy_response_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response_event_history DROP CONSTRAINT IF EXISTS vreh_usr_acc_changes_id_fk;
		ALTER TABLE public.working_monthly_vacancy_response_event_history DROP CONSTRAINT IF EXISTS vreh_usr_acc_creation_id_fk;
	
		ALTER TABLE public.working_monthly_vacancy_response_event_history RENAME COLUMN vacancy_response_id TO working_monthly_vacancy_response_id;		
	
		ALTER TABLE public.working_monthly_vacancy_response_event_history ADD CONSTRAINT wmvreh_guid_unique_key UNIQUE (guid);
		ALTER TABLE public.working_monthly_vacancy_response_event_history ADD CONSTRAINT wmvreh_pkey PRIMARY KEY (id);
		ALTER TABLE public.working_monthly_vacancy_response_event_history ADD CONSTRAINT wmvreh_working_monthly_vacancy_response_id_fk FOREIGN KEY (working_monthly_vacancy_response_id) REFERENCES public.working_monthly_vacancy_response(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response_event_history ADD CONSTRAINT wmvreh_usr_acc_changes_id_fk FOREIGN KEY (usr_acc_changes_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
		ALTER TABLE public.working_monthly_vacancy_response_event_history ADD CONSTRAINT wmvreh_usr_acc_creation_id_fk FOREIGN KEY (usr_acc_creation_id) REFERENCES public.usr_acc(id) ON DELETE RESTRICT;
	END IF;
--


	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "is_vacancy" bool NOT NULL DEFAULT false;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_selection_mnemocode" varchar(50) NOT NULL DEFAULT ''::character varying;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_cost" numeric(10, 3) NOT NULL DEFAULT 0;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "job_on_vacancy_id" int8 NULL;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_description_txt" text NOT NULL DEFAULT ''::character varying;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_date_from_utc" timestamp NULL;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_date_to_utc" timestamp NULL;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "vacancy_closed_date_utc" timestamp NULL;
	ALTER TABLE public.working_monthly ADD COLUMN IF NOT EXISTS "working_monthly_vacancy_response_count" int4 NOT NULL DEFAULT 0;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'working_monthly' AND constraint_name = 'wm_vacancy_selection_chk'
	) THEN
		ALTER TABLE public.working_monthly ADD CONSTRAINT wm_vacancy_selection_chk CHECK (((vacancy_selection_mnemocode)::text = ANY(ARRAY[(''::character varying)::text,('trading_point_employee'::character varying)::text,('stakeholder_employee'::character varying)::text,('outsource'::character varying)::text])));
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE table_name = 'working_monthly' AND constraint_name = 'wm_job_on_vacancy_id_fk'
	) THEN
		ALTER TABLE public.working_monthly ADD CONSTRAINT wm_job_on_vacancy_id_fk FOREIGN KEY (job_on_vacancy_id) REFERENCES public.job(id) ON DELETE RESTRICT;
	END IF;

	ALTER TABLE public.working_monthly DROP CONSTRAINT IF EXISTS wm_vacancy_id_fk;

	ALTER TABLE public.working_monthly DROP COLUMN IF EXISTS "vacancy_id";
--


	DROP TABLE IF EXISTS vacancy CASCADE;

	DELETE FROM table_data 
	WHERE name = 'vacancy';
--


	DROP TABLE IF EXISTS vacancy_working_shift_plan;

	DELETE FROM table_data 
	WHERE name = 'vacancy_working_shift_plan';
--
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

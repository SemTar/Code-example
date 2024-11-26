const up = `
DO $$
	DECLARE
  record_count INTEGER;
	BEGIN

		IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trading_point' AND column_name = 'orgstructural_unit_id')
		THEN

      ALTER TABLE public.trading_point RENAME COLUMN "mnemocode" TO "mnemocode_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "town_id" TO "town_id_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "how_to_find_txt" TO "how_to_find_txt_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "map_point_json" TO "map_point_json_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "contact_info_txt" TO "contact_info_txt_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "time_zone" TO "time_zone_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "description_txt" TO "description_txt_bak";
      ALTER TABLE public.trading_point RENAME COLUMN "date_blocked_utc" TO "date_blocked_utc_bak";

      ALTER TABLE public.trading_point DROP CONSTRAINT IF EXISTS tp_town_id_fk;


      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "orgstructural_unit_id" int8 NULL;
    
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "mnemocode" varchar(200) NULL DEFAULT ''::character varying;
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "town_id" bigint NULL;
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "how_to_find_txt" text NULL DEFAULT ''::character varying;
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "map_point_json" json NULL;
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "contact_info_txt" text NULL DEFAULT ''::character varying;
      
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "time_zone_id" int8 NULL;

      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "description_txt" text NULL DEFAULT ''::character varying;
      ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "date_blocked_utc" timestamp without time zone NULL;


      SELECT COUNT(*) INTO record_count FROM trading_point;
        IF record_count > 0 THEN
        IF EXISTS (SELECT 1 FROM orgstructural_unit WHERE name = 'service_orgstructural_unit') THEN
          UPDATE public.trading_point SET
            "orgstructural_unit_id" = (SELECT id FROM orgstructural_unit WHERE name = 'service_orgstructural_unit'),
            "mnemocode" = "mnemocode_bak",
            "town_id" = "town_id_bak",
            "how_to_find_txt" = "how_to_find_txt_bak",
            "map_point_json" = "map_point_json_bak",
            "contact_info_txt" = "contact_info_txt_bak",
            "description_txt" = "description_txt_bak",
            "date_blocked_utc" = "date_blocked_utc_bak";
          UPDATE trading_point AS tp
            SET time_zone_id = (
              SELECT COALESCE(
                (SELECT id FROM time_zone WHERE name = tp.time_zone_bak),
                (SELECT id FROM time_zone WHERE name = 'Москва')
              )
            );
          ELSE
            RAISE EXCEPTION 'В вашей таблице trading_point присутствуют записи. Для успешного запуска 000002_refactored_trading_point необходимо создать поле с именем service_orgstructural_unit в таблице orgstructural_unit';
          END IF;
        END IF;

        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "mnemocode_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "town_id_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "how_to_find_txt_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "map_point_json_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "contact_info_txt_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "time_zone_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "description_txt_bak";
        ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "date_blocked_utc_bak";

        ALTER TABLE public.trading_point ALTER COLUMN "mnemocode" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "orgstructural_unit_id" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "town_id" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "how_to_find_txt" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "contact_info_txt" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "time_zone_id" SET NOT NULL;
        ALTER TABLE public.trading_point ALTER COLUMN "description_txt" SET NOT NULL;

        ALTER TABLE public.trading_point ADD CONSTRAINT tp_town_id_fk FOREIGN KEY (town_id) REFERENCES town(id) ON DELETE RESTRICT;
        ALTER TABLE public.trading_point ADD CONSTRAINT tp_orgstructural_unit_id_fk FOREIGN KEY (orgstructural_unit_id) REFERENCES orgstructural_unit(id) ON DELETE RESTRICT;
        ALTER TABLE public.trading_point ADD CONSTRAINT tp_time_zone_id_fk FOREIGN KEY (time_zone_id) REFERENCES time_zone(id) ON DELETE RESTRICT;
		END IF;
	END 
$$;
`;

const down = `
DO $$
	DECLARE
	record_count INTEGER;
	BEGIN
		IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trading_point' AND column_name = 'time_zone')
		THEN
		
		ALTER TABLE public.trading_point RENAME COLUMN "description_txt" TO "description_txt_bak";
		ALTER TABLE public.trading_point RENAME COLUMN "date_blocked_utc" TO "date_blocked_utc_bak";
		
		ALTER TABLE public.trading_point DROP CONSTRAINT IF EXISTS tp_orgstructural_unit_id_fk; 
		ALTER TABLE public.trading_point DROP CONSTRAINT IF EXISTS tp_time_zone_id_fk;

    ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "time_zone" varchar(500) NULL DEFAULT ''::character varying;

    ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "description_txt" text NULL DEFAULT ''::character varying;
    ALTER TABLE public.trading_point ADD COLUMN IF NOT EXISTS "date_blocked_utc" timestamp without time zone NULL;

		SELECT COUNT(*) INTO record_count FROM trading_point;
		IF record_count > 0 THEN
        UPDATE public.trading_point SET
              "description_txt" = "description_txt_bak",
              "date_blocked_utc" = "date_blocked_utc_bak";
      UPDATE trading_point AS tp
        SET time_zone = (
          SELECT COALESCE(
              (SELECT name FROM time_zone WHERE id = tp.time_zone_id),
              (SELECT '')
          )
					);
	END IF;


    ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "orgstructural_unit_id";
    ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "time_zone_id";
    ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "description_txt_bak";
    ALTER TABLE public.trading_point DROP COLUMN IF EXISTS "date_blocked_utc_bak";
  
    ALTER TABLE public.trading_point ALTER COLUMN "time_zone" SET NOT NULL;
    ALTER TABLE public.trading_point ALTER COLUMN "description_txt" SET NOT NULL;
		
		
		
		END IF;
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

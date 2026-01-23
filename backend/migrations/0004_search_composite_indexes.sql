CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX item_name_trgm_idx ON Item USING gin (item_name gin_trgm_ops);
CREATE INDEX item_types_trgm_idx ON Item USING gin (item_types gin_trgm_ops);

CREATE INDEX task_name_trgm_idx ON Task USING gin (task_name gin_trgm_ops);
CREATE INDEX trader_trgm_idx ON Task USING gin (trader gin_trgm_ops);

CREATE INDEX ammo_caliber_trgm_idx ON Ammo USING gin (caliber gin_trgm_ops);
CREATE INDEX ammo_type_trgm_idx ON Ammo USING gin (ammo_type gin_trgm_ops);

CREATE INDEX item_name_types_flea_idx ON Item (item_name text_pattern_ops, item_types text_pattern_ops, is_flea);
CREATE INDEX buyfor_trader_item_price_idx ON BuyFor (trader_name, item_id, price_rub);

CREATE INDEX task_name_trader_level_idx ON Task (min_player_level, kappa_required, lightkeeper_required);
CREATE INDEX objective_task_objtype_idx ON Objective (task_id) WHERE obj_type IS NOT NULL;
CREATE INDEX objective_objtype_trgm_idx ON Objective USING gin (obj_type gin_trgm_ops);

CREATE INDEX ammo_numeric_idx ON Ammo (damage, penetration_power, initial_speed);

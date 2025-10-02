-- Add migration script here
CREATE TABLE IF NOT EXISTS Item (
    _id CHAR(24) PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(128) NOT NULL,
    avg_24h_price INT NOT NULL,
    base_price INT NOT NULL,
    change_last_48h_percent REAL NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    wiki VARCHAR(2048) NOT NULL,
    item_types VARCHAR(255) NOT NULL,
    buy_from_flea_instant_profit INT NOT NULL,
    buy_from_trader_instant_profit INT NOT NULL,
    per_slot INT NOT NULL
);

CREATE TABLE IF NOT EXISTS BuyFor(
    id SERIAL PRIMARY KEY,
    price INT NOT NULL,
    currency VARCHAR(24) NOT NULL,
    price_rub INT NOT NULL,
    trader_name VARCHAR(24) NOT NULL,
    min_trader_level INT NOT NULL,
    buy_limit INT NOT NULL,
    item_id CHAR(24) NOT NULL,
    CONSTRAINT buys FOREIGN KEY (item_id) REFERENCES Item(_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SellFor(
    id SERIAL PRIMARY KEY,
    price INT NOT NULL,
    currency VARCHAR(24) NOT NULL,
    price_rub INT NOT NULL,
    trader_name VARCHAR(24) NOT NULL,
    found_in_raid_required BOOL NOT NULL,
    item_id CHAR(24) NOT NULL,
    CONSTRAINT sells FOREIGN KEY (item_id) REFERENCES Item(_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SavedItemData(
    id SERIAL PRIMARY KEY,
    price_rub INT NOT NULL,
    recorded_time TIMESTAMPTZ NOT NULL,
    item_id CHAR(24) NOT NULL
);

CREATE TABLE IF NOT EXISTS Task(
    _id CHAR(24) PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    min_player_level INT NOT NULL,
    trader VARCHAR(255) NOT NULL,
    faction_name VARCHAR(24) NOT NULL,
    kappa_required BOOL NOT NULL,
    lightkeeper_required BOOL NOT NULL,
    wiki VARCHAR(2048) NOT NULL
);

CREATE TABLE IF NOT EXISTS Objective(
    id SERIAL PRIMARY KEY,
    obj_type VARCHAR(255) NOT NULL,
    obj_description TEXT NOT NULL,
    map_name VARCHAR(255) NOT NULL,
    map_wiki VARCHAR(2048) NOT NULL,
    count INT NOT NULL,
    needed_item_ids TEXT[] NOT NULL,
    task_id CHAR(24) NOT NULL,
    CONSTRAINT objectives FOREIGN KEY (task_id) REFERENCES Task(_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TaskRequirement(
    id SERIAL PRIMARY KEY,
    status VARCHAR(128) NOT NULL,
    req_task_id CHAR(24) NOT NULL,
    task_id CHAR(24) NOT NULL,
    CONSTRAINT taskRequirements FOREIGN KEY (task_id) REFERENCES Task(_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DevicePreferences(
    id UUID PRIMARY KEY,
    completed_tasks TEXT[] DEFAULT '{}' NOT NULL,
    last_visited TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS ItemQueryParams(
    id UUID PRIMARY KEY,
    search VARCHAR(255) DEFAULT '' NOT NULL,
    sort_asc BOOL DEFAULT FALSE NOT NULL,
    sort_by VARCHAR(64) DEFAULT 'flea_market' NOT NULL,
    item_type VARCHAR(64) DEFAULT 'any' NOT NULL,
    FOREIGN KEY (id) REFERENCES DevicePreferences(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TaskQueryParams(
    id UUID PRIMARY KEY,
    search VARCHAR(255) DEFAULT '' NOT NULL,
    is_kappa BOOL DEFAULT FALSE NOT NULL,
    is_lightkeeper BOOL DEFAULT FALSE NOT NULL,
    player_lvl INT DEFAULT 99 NOT NULL,
    obj_type VARCHAR(64) DEFAULT 'any' NOT NULL,
    trader VARCHAR(64) DEFAULT 'any' NOT NULL,
    FOREIGN KEY (id) REFERENCES DevicePreferences(id) ON DELETE CASCADE
);

CREATE INDEX ON BuyFor(item_id);
CREATE INDEX ON SellFor(item_id);

CREATE INDEX ON Objective(task_id);
CREATE INDEX ON TaskRequirement(task_id);

-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- 
-- item search indexes
-- CREATE INDEX idx_item_name_trgm ON Item USING gin (item_name gin_trgm_ops);
-- CREATE INDEX idx_item_types_trgm ON Item USING gin (item_types gin_trgm_ops);
-- 
-- task search indexes
-- CREATE INDEX idx_task_name_trgm ON Task USING gin (task_name gin_trgm_ops);
-- CREATE INDEX idx_trader_trgm ON Task USING gin (trader gin_trgm_ops);
-- CREATE INDEX idx_obj_type_trgm ON Objective USING gin (obj_type gin_trgm_ops);

CREATE INDEX idx_saveditemdata_item_time ON SavedItemData (item_id, recorded_time DESC, id);

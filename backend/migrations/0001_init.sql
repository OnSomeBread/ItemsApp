-- Add migration script here
CREATE TABLE IF NOT EXISTS Item (
    _id CHAR(24) PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(128) NOT NULL,
    avg_24h_price INT DEFAULT 0 NOT NULL,
    base_price INT DEFAULT 0 NOT NULL,
    change_last_48h_percent REAL DEFAULT 0 NOT NULL,
    width INT DEFAULT 0 NOT NULL,
    height INT DEFAULT 0 NOT NULL,
    wiki VARCHAR(2048) NOT NULL,
    item_types VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS BuyFor(
    id SERIAL PRIMARY KEY,
    price INT DEFAULT 0 NOT NULL,
    currency VARCHAR(24) NOT NULL,
    price_rub INT DEFAULT 0 NOT NULL,
    trader_name VARCHAR(24) NOT NULL,
    min_trader_level INT DEFAULT 0 NOT NULL,
    buy_limit INT DEFAULT 0 NOT NULL,
    item_id CHAR(24) NOT NULL,
    CONSTRAINT buys FOREIGN KEY (item_id) REFERENCES Item(_id)
);

CREATE TABLE IF NOT EXISTS SellFor(
    id SERIAL PRIMARY KEY,
    price INT DEFAULT 0 NOT NULL,
    currency VARCHAR(24) NOT NULL,
    price_rub INT DEFAULT 0 NOT NULL,
    trader_name VARCHAR(24) NOT NULL,
    sell_offer_fee_rate REAL DEFAULT 0 NOT NULL,
    sell_requirement_fee_rate REAL DEFAULT 0 NOT NULL,
    found_in_raid_required BOOL DEFAULT False NOT NULL,
    item_id CHAR(24) NOT NULL,
    CONSTRAINT sells FOREIGN KEY (item_id) REFERENCES Item(_id)
);

CREATE TABLE IF NOT EXISTS SavedItemData(
    id SERIAL PRIMARY KEY,
    avg_24h_price INT DEFAULT 0 NOT NULL,
    change_last_48h_percent REAL DEFAULT 0 NOT NULL,
    price_rub INT DEFAULT 0 NOT NULL,
    recorded_time TIMESTAMPTZ NOT NULL,
    item_id CHAR(24) NOT NULL
);

CREATE TABLE IF NOT EXISTS Task(
    _id CHAR(24) PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(128) NOT NULL,
    experience INT DEFAULT 0 NOT NULL,
    min_player_level INT DEFAULT 0 NOT NULL,
    trader VARCHAR(255) NOT NULL,
    faction_name VARCHAR(24) NOT NULL,
    kappa_required BOOL DEFAULT False NOT NULL,
    lightkeeper_required BOOL DEFAULT False NOT NULL,
    wiki VARCHAR(2048) NOT NULL
);

CREATE TABLE IF NOT EXISTS Objective(
    id SERIAL PRIMARY KEY,
    obj_type VARCHAR(255) NOT NULL,
    obj_description TEXT NOT NULL,
    map_name VARCHAR(255) NOT NULL,
    map_wiki VARCHAR(2048) NOT NULL,
    task_id CHAR(24) NOT NULL,
    CONSTRAINT objectives FOREIGN KEY (task_id) REFERENCES Task(_id)
);

CREATE TABLE IF NOT EXISTS TaskRequirement(
    id SERIAL PRIMARY KEY,
    status VARCHAR(128) NOT NULL,
    req_task_id CHAR(24) NOT NULL,
    task_id CHAR(24) NOT NULL,
    CONSTRAINT taskRequirements FOREIGN KEY (task_id) REFERENCES Task(_id)
);

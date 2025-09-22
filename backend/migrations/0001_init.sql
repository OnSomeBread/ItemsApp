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
    CONSTRAINT buys FOREIGN KEY (item_id) REFERENCES Item(_id)
);

CREATE TABLE IF NOT EXISTS SellFor(
    id SERIAL PRIMARY KEY,
    price INT NOT NULL,
    currency VARCHAR(24) NOT NULL,
    price_rub INT NOT NULL,
    trader_name VARCHAR(24) NOT NULL,
    found_in_raid_required BOOL NOT NULL,
    item_id CHAR(24) NOT NULL,
    CONSTRAINT sells FOREIGN KEY (item_id) REFERENCES Item(_id)
);

CREATE TABLE IF NOT EXISTS SavedItemData(
    id SERIAL PRIMARY KEY,
    avg_24h_price INT NOT NULL,
    change_last_48h_percent REAL NOT NULL,
    price_rub INT NOT NULL,
    recorded_time TIMESTAMPTZ NOT NULL,
    item_id CHAR(24) NOT NULL
);

CREATE TABLE IF NOT EXISTS Task(
    _id CHAR(24) PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(128) NOT NULL,
    experience INT NOT NULL,
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

-- potential index ideas however from testing I believe the 
-- dataset might be too small to benefit significantly from these

-- CREATE INDEX ON BuyFor(item_id);
-- CREATE INDEX ON SellFor(item_id);

-- CREATE INDEX ON BuyFor(item_id, id);
-- CREATE INDEX ON SellFor(item_id, id);

-- CREATE INDEX ON Objective(task_id);
-- CREATE INDEX ON TaskRequirement(task_id);

-- CREATE INDEX ON Objective(task_id, id);
-- CREATE INDEX ON TaskRequirement(task_id, id);

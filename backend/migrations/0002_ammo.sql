CREATE TABLE Ammo (
    accuracy_modifier        REAL        NOT NULL,
    ammo_type                TEXT        NOT NULL DEFAULT '',
    caliber                  TEXT        NOT NULL,
    armor_damage             INT         NOT NULL DEFAULT 0,
    fragmentation_chance     REAL        NOT NULL DEFAULT 0,
    damage                   INT         NOT NULL DEFAULT 0,
    heavy_bleed_modifier     REAL        NOT NULL DEFAULT 0,
    initial_speed            REAL        NOT NULL,
    light_bleed_modifier     REAL        NOT NULL DEFAULT 0,
    penetration_chance       REAL        NOT NULL DEFAULT 0,
    penetration_power        INT         NOT NULL DEFAULT 0,
    penetration_power_deviation REAL     NOT NULL,
    projectile_count         INT         NOT NULL,
    recoil_modifier          REAL        NOT NULL,
    ricochet_chance          REAL        NOT NULL DEFAULT 0,
    stack_max_size           INT         NOT NULL DEFAULT 0,
    stamina_burn_per_damage  REAL        NOT NULL,
    tracer                   BOOLEAN     NOT NULL DEFAULT FALSE,
    tracer_color             TEXT        NOT NULL DEFAULT '',
    weight                   REAL        NOT NULL DEFAULT 0,
    item_id                  CHAR(24)    PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS AmmoQueryParams(
    id UUID PRIMARY KEY,
    search VARCHAR(255) DEFAULT '' NOT NULL,
    sort_by VARCHAR(255) DEFAULT 'any' NOT NULL,
    sort_asc BOOL DEFAULT FALSE NOT NULL,
    damage INT DEFAULT 0 NOT NULL,
    penetration_power INT DEFAULT 0 NOT NULL,
    initial_speed REAL DEFAULT 0 NOT NULL,
    ammo_type VARCHAR(64) DEFAULT 'any' NOT NULL,
    FOREIGN KEY (id) REFERENCES DevicePreferences(id) ON DELETE CASCADE
);

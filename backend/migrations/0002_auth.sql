CREATE TABLE IF NOT EXISTS DevicePreferences(
    id UUID PRIMARY KEY,
    completed_tasks TEXT[] DEFAULT '{}' NOT NULL,
    last_visited TIMESTAMPTZ DEFAULT now() NOT NULL
);

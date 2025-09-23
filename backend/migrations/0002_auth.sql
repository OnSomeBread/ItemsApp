CREATE TABLE IF NOT EXISTS DevicePreferences(
    id UUID PRIMARY KEY,
    completed_tasks TEXT[] DEFAULT '{}',
    last_visited TIMESTAMPTZ DEFAULT now()
);

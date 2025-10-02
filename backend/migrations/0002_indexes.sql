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

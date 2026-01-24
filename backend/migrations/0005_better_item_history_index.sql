DROP INDEX idx_saveditemdata_item_time;
CREATE INDEX idx_saveditemdata_item_time_covering ON SavedItemData (item_id, recorded_time) INCLUDE (price_rub);

-- although excessive some of these could be removed in the future 
-- since db is not too large and writes are rare this works
CREATE INDEX idx_item_item_name_id ON Item (item_name, _id);
CREATE INDEX idx_item_short_name_id ON Item (short_name, _id);
CREATE INDEX idx_item_base_price_id ON Item (base_price, _id);
CREATE INDEX idx_item_avg_24h_price_id ON Item (avg_24h_price, _id);
CREATE INDEX idx_item_change_last_48h_percent_id ON Item (change_last_48h_percent, _id);
CREATE INDEX idx_item_buy_from_flea_instant_profit_id ON Item (buy_from_flea_instant_profit, _id);
CREATE INDEX idx_item_buy_from_trader_instant_profit_id ON Item (buy_from_flea_instant_profit, _id);
CREATE INDEX idx_item_per_slot_id ON Item (per_slot, _id);
CREATE INDEX idx_buyfor_price_rub_item ON BuyFor (price_rub, item_id);

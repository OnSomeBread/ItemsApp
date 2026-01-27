"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import type { Item, ItemQueryParams, ItemStats } from "../types";
import { apiFetch, formatSecondsToTime, getBestBuy, getBestSell } from "../utils";
import ItemSearchBar from "./ItemSearchBar";
import ImageComponent from "./ImageComponent";

interface Props {
  initItems: Item[];
  initQueryParams: ItemQueryParams;
  headers: HeadersInit;
  initItemStats: ItemStats;
}

function ItemScrollCompact({
  initItems,
  initQueryParams,
  headers,
  initItemStats,
}: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [timer, setTimer] = useState(
    initItemStats.time_till_items_refresh_secs
  );
  const [hasMore, setHasMore] = useState(
    initItems.length === initQueryParams.limit
  );
  const [queryParams, setQueryParams] = useState(initQueryParams);
  const [changedItemsToggle, setChangedItemsToggle] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedItemsToggle]);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const fetchItems = useCallback((offset: number) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    apiFetch("/items?" + params.toString(), {
      cache: "no-store",
      headers,
    })
      .then((res1) => {
        res1
          .json()
          .then((items: Item[]) => {
            if (offset === 0) {
              setAllItems(items);
            } else {
              setAllItems((prev) => [...(prev ?? []), ...items]);
            }

            changeQueryParams("offset", queryParams.offset + queryParams.limit);
            setHasMore(items.length === queryParams.limit);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  }, [queryParams, headers]);

  const changeQueryParams = useCallback((key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
    if (key !== "offset") {
      setChangedItemsToggle((prev) => !prev);
    }
  }, []);

  const fetchScroll = useCallback(() => {
    fetchItems(queryParams.offset);
  }, [fetchItems, queryParams.offset]);

  // memoize sort handlers
  const handleNameSort = useCallback(() => {
    setQueryParams((prev) => ({
      ...prev,
      sort_asc: !prev.sort_asc,
      sort_by: "item_name",
    }));
  }, []);

  const handleFleatoTraderSort = useCallback(() => {
    setQueryParams((prev) => ({
      ...prev,
      sort_asc: !prev.sort_asc,
      sort_by: "buy_from_flea_instant_profit",
    }));
  }, []);

  const handleTraderToFleaSort = useCallback(() => {
    setQueryParams((prev) => ({
      ...prev,
      sort_asc: !prev.sort_asc,
      sort_by: "buy_from_trader_instant_profit",
    }));
  }, []);

  const handlePerSlotSort = useCallback(() => {
    setQueryParams((prev) => ({
      ...prev,
      sort_asc: !prev.sort_asc,
      sort_by: "per_slot",
    }));
  }, []);

  return (
    <>
      <ItemSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        clearCounts={() => {}}
      />
      <p className="h-2 pl-4">
        {formatSecondsToTime(timer)} Time Til Item List Refresh
      </p>
      <InfiniteScroll
        dataLength={allItems?.length ?? 0}
        next={fetchScroll}
        hasMore={hasMore}
        loader={<article aria-busy="true"></article>}
      >
        <table>
          <thead>
            <tr>
              <th className="font-medium">Icon</th>
              <th
                className="font-medium"
                onClick={handleNameSort}
              >
                Name{" "}
                {queryParams.sort_by === "item_name" &&
                  (queryParams.sort_asc ? "⭡" : "⭣")}
              </th>
              <th className="font-medium">Buy For</th>
              <th className="font-medium">Sell For</th>
              <th
                className="font-medium"
                onClick={handleFleatoTraderSort}
              >
                Flea ➝ Trader{" "}
                {queryParams.sort_by === "buy_from_flea_instant_profit" &&
                  (queryParams.sort_asc ? "⭡" : "⭣")}
              </th>
              <th
                className="font-medium"
                onClick={handleTraderToFleaSort}
              >
                Trader ➝ Flea{" "}
                {queryParams.sort_by === "buy_from_trader_instant_profit" &&
                  (queryParams.sort_asc ? "⭡" : "⭣")}
              </th>
              <th
                className="font-medium"
                onClick={handlePerSlotSort}
              >
                Per Slot{" "}
                {queryParams.sort_by === "per_slot" &&
                  (queryParams.sort_asc ? "⭡" : "⭣")}
              </th>
              <th className="font-medium">Wiki</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item) => (
              <ItemTableRow key={item._id} item={item} />
            ))}
          </tbody>
        </table>
      </InfiniteScroll>
    </>
  );
}

export default memo(ItemScrollCompact);

// memoized table row component to prevent re-renders of individual rows
const ItemTableRow = memo(({ item }: { item: Item }) => {
  const bestBuy = useMemo(() => getBestBuy(item), [item._id, item.buys]);
  const bestSell = useMemo(() => getBestSell(item), [item._id, item.sells]);

  return (
    <tr>
      <td className="!h-10 !w-16">
        <ImageComponent
          imgSrc={"/" + item._id + ".webp"}
          alt={item.item_name}
          priority={false}
          width={16}
          height={16}
        />
      </td>
      <td className="w-140">
        <Link
          href={{
            pathname: "/item_view",
            query: "id=" + item._id,
          }}
        >
          {item.item_name}
        </Link>
      </td>
      <td className="w-90">
        {bestBuy !== null &&
          bestBuy.trader_name !== "Flea Market" && (
            <p>
              {"buy " +
                bestBuy.buy_limit +
                " @ " +
                bestBuy.trader_name +
                " " +
                bestBuy.min_trader_level +
                " For " +
                bestBuy.price.toLocaleString("en-us") +
                " " +
                bestBuy.currency}
            </p>
          )}
        {bestBuy !== null &&
          bestBuy.trader_name === "Flea Market" && (
            <p>{bestBuy.price_rub.toLocaleString("en-us")} RUB</p>
          )}
      </td>
      <td className="w-60">
        {bestSell !== null && (
          <p>
            {bestSell.trader_name}:{" "}
            {bestSell.price_rub.toLocaleString("en-us")} RUB
          </p>
        )}
      </td>
      <td className="w-60">
        <p
          className={
            item.buy_from_flea_instant_profit > 0
              ? "!text-green-600"
              : "!text-red-600"
          }
        >
          {item.buy_from_flea_instant_profit.toLocaleString("en-us")} RUB
        </p>
      </td>
      <td className="w-60">
        <p
          className={
            item.buy_from_trader_instant_profit > 0
              ? "!text-green-600"
              : "!text-red-600"
          }
        >
          {item.buy_from_trader_instant_profit.toLocaleString("en-us")} RUB
        </p>
      </td>
      <td className="w-60">
        <p>{item.per_slot.toLocaleString("en-us")} RUB</p>
      </td>
      <td>
        <a
          href={item.wiki}
          target="_blank"
          rel="noreferrer"
          className="!no-underline"
        >
          🔗
        </a>
      </td>
    </tr>
  );
});

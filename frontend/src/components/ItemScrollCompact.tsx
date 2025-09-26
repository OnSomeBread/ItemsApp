"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Item, ItemQueryParams } from "../types";
import { getBestBuy, getBestSell } from "../utils";
import ItemSearchBar from "./ItemSearchBar";
import dynamic from "next/dynamic";
const ImageComponent = dynamic(() => import("./ImageComponent"));
import { API_BASE } from "../constants";

interface Props {
  initItems: Item[];
  initQueryParams: ItemQueryParams;
}

function ItemScrollCompact({ initItems, initQueryParams }: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initQueryParams.limit);
  const [loading, setLoading] = useState(false);
  const [queryParams, setQueryParams] = useState(initQueryParams);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(queryParams)]);

  const fetchItems = () => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    fetch(API_BASE + "/api/items?" + params.toString())
      .then((res1) => {
        res1
          .json()
          .then((items: Item[]) => {
            if (offset === 0) {
              setAllItems(items);
            } else {
              setAllItems((prev) => [...(prev ?? []), ...items]);
            }

            setHasMore(items.length === queryParams.limit);
            setOffset((prev) => prev + queryParams.limit);
            setLoading(false);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setOffset(0);
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  return (
    <>
      <ItemSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        clearCounts={() => {}}
      />
      <InfiniteScroll
        dataLength={allItems?.length ?? 0}
        next={fetchItems}
        hasMore={hasMore}
        loader={<article aria-busy="true"></article>}
      >
        <table>
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Buy For</th>
              <th>Sell For</th>
              <th>From Flea To Trader Profit</th>
              <th>From Trader To Flea Profit</th>
              <th>Per Slot to Flea</th>
              <th>Wiki page</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item) => {
              const bestBuy = getBestBuy(item);
              const bestSell = getBestSell(item);

              return (
                <tr key={item._id}>
                  <td className="!h-10 !w-16">
                    <ImageComponent
                      imgSrc={"/" + item._id + ".webp"}
                      alt={item.item_name}
                      priority={true}
                      width={16}
                      height={16}
                    />
                  </td>
                  <td className="w-100">
                    <Link
                      href={{ pathname: "/item_view", query: "id=" + item._id }}
                    >
                      {item.item_name}
                    </Link>
                  </td>
                  <td>
                    {bestBuy !== null &&
                      bestBuy.trader_name !== "Flea Market" && (
                        <p>
                          {"buy " +
                            bestBuy.buy_limit +
                            " from " +
                            bestBuy.trader_name +
                            " lvl " +
                            bestBuy.min_trader_level +
                            ": " +
                            bestBuy.price.toLocaleString("en-us") +
                            " " +
                            bestBuy.currency}
                        </p>
                      )}
                    {bestBuy !== null &&
                      bestBuy.trader_name === "Flea Market" && (
                        <p>
                          {bestBuy.trader_name}:{" "}
                          {bestBuy.price_rub.toLocaleString("en-us")} RUB
                        </p>
                      )}
                  </td>
                  <td>
                    {bestSell !== null && (
                      <p>
                        {bestSell.trader_name}:{" "}
                        {bestSell.price_rub.toLocaleString("en-us")} RUB
                      </p>
                    )}
                  </td>
                  <td>
                    <p>
                      {item.buy_from_flea_instant_profit.toLocaleString(
                        "en-us"
                      )}{" "}
                      RUB
                    </p>
                  </td>
                  <td>
                    <p>
                      {item.buy_from_trader_instant_profit.toLocaleString(
                        "en-us"
                      )}{" "}
                      RUB
                    </p>
                  </td>
                  <td>
                    <p>{item.per_slot.toLocaleString("en-us")} RUB</p>
                  </td>
                  <td>
                    <a href={item.wiki}>wiki link</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </InfiniteScroll>
    </>
  );
}

export default ItemScrollCompact;

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
  headers: HeadersInit;
}

function ItemScrollCompact({ initItems, initQueryParams, headers }: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [hasMore, setHasMore] = useState(
    initItems.length === initQueryParams.limit
  );
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

    fetch(API_BASE + "/api/items?" + params.toString(), {
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
              // HARD LIMIT ON ITEMS DISPLAYED ON SCREEN AT ANY GIVEN MOMENT
              if (allItems.length < 300) {
                setAllItems((prev) => [...(prev ?? []), ...items]);
              }
            }

            setHasMore(
              items.length === queryParams.limit && allItems.length < 300
            );
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
            <tr className="bg-gray-100 text-left">
              <th className="p-2 font-medium">Icon</th>
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 font-medium">Buy For</th>
              <th className="p-2 font-medium">Sell For</th>
              <th className="p-2 font-medium">Flea ➝ Trader</th>
              <th className="p-2 font-medium">Trader ➝ Flea</th>
              <th className="p-2 font-medium">Per Slot</th>
              <th className="p-2 font-medium">Wiki</th>
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
                  <td className="w-100">
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
                  <td className="w-100">
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
                      {item.buy_from_flea_instant_profit.toLocaleString(
                        "en-us"
                      )}{" "}
                      RUB
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
                      {item.buy_from_trader_instant_profit.toLocaleString(
                        "en-us"
                      )}{" "}
                      RUB
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
            })}
          </tbody>
        </table>
      </InfiniteScroll>
    </>
  );
}

export default ItemScrollCompact;

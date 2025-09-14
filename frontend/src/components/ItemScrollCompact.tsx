"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Buy, Item, ItemQueryParams, Sell } from "../types";
import ItemSearchBar from "./ItemSearchBar";
import dynamic from "next/dynamic";
const ImageComponent = dynamic(() => import("./ImageComponent"));

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

  useEffect(() => {
    fetchItems()
      .then()
      .catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(queryParams)]);

  const fetchItems = async () => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    const res1 = await fetch("api/items?" + params.toString());

    const items = (await res1.json()) as Item[];

    if (offset === 0) {
      setAllItems(items);
    } else {
      setAllItems((prev) => [...(prev ?? []), ...items]);
    }

    setHasMore(items.length === queryParams.limit);
    setOffset((prev) => prev + queryParams.limit);
    setLoading(false);
  };

  const changeQueryParams = (key: string, value: string | number) => {
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
              <th>Base Price</th>
              <th>Buy For</th>
              <th>Sell For</th>
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
                      alt={item.name}
                      priority={true}
                      width={16}
                      height={16}
                    />
                  </td>
                  <td>
                    <Link
                      className="w-100"
                      href={{ pathname: "/item_view", query: "id=" + item._id }}
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td>
                    <p>{item.basePrice} RUB</p>
                  </td>
                  <td>
                    {bestBuy !== null && (
                      <p>
                        {"buy " +
                          bestBuy.buyLimit +
                          " from " +
                          bestBuy.name +
                          " lvl " +
                          bestBuy.minTraderLevel +
                          ": " +
                          bestBuy.price.toLocaleString("en-us") +
                          " " +
                          bestBuy.currency}
                      </p>
                    )}
                  </td>
                  <td>
                    {bestSell !== null && (
                      <p>
                        {bestSell.name}: {bestSell.priceRUB} RUB
                      </p>
                    )}
                  </td>
                  <td>
                    <a href={item.link}>wiki link</a>
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

const getBestSell = (item: Item) => {
  let bestSell: Sell | null = null;
  for (const trader of item.sells) {
    if (bestSell === null || trader.priceRUB > bestSell.priceRUB) {
      bestSell = trader;
    }
  }
  return bestSell;
};

const getBestBuy = (item: Item) => {
  let bestBuy: Buy | null = null;
  for (const trader of item.buys) {
    if (bestBuy === null || trader.priceRUB < bestBuy.priceRUB) {
      bestBuy = trader;
    }
  }
  return bestBuy;
};

export default ItemScrollCompact;

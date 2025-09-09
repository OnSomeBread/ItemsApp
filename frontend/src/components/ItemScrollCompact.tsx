"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { useState } from "react";
import Link from "next/link";
import { Item, ItemQueryParams } from "../types";
//import ImageComponent from "./ImageComponent";

interface Props {
  initItems: Item[];
  queryParams: ItemQueryParams;
}

function ItemScrollCompact({ initItems, queryParams }: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(queryParams.limit);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    const res1 = await fetch("/api/items?" + params.toString());

    const items: Item[] = await res1.json();

    setHasMore(items.length === queryParams.limit);
    setAllItems((prev) => [...(prev ?? []), ...items]);
    setOffset((prev) => prev + queryParams.limit);
    setLoading(false);
  };

  const getBestSell = (item: Item) => {
    let bestPrice = Number.MIN_SAFE_INTEGER;
    let bestTrader = "";
    item.sells.forEach((sellFor) => {
      if (sellFor.priceRUB > bestPrice) {
        bestPrice = sellFor.priceRUB;
        bestTrader = sellFor.name;
      }
    });

    return [bestPrice, bestTrader];
  };

  const getBestBuy = (item: Item) => {
    let bestPrice = Number.MAX_SAFE_INTEGER;
    let bestTrader = "";
    item.buys.forEach((buyFor) => {
      if (buyFor.priceRUB < bestPrice) {
        bestPrice = buyFor.priceRUB;
        bestTrader = buyFor.name;
      }
    });

    return [bestPrice, bestTrader];
  };

  return (
    <InfiniteScroll
      dataLength={allItems?.length ?? 0}
      next={fetchItems}
      hasMore={hasMore}
      loader={<article aria-busy="true"></article>}
    >
      <table>
        <thead>
          <tr>
            {/* <th>Icon</th> */}
            <th>Name</th>
            <th>Base Price</th>
            <th>Buy For</th>
            <th>Sell For</th>
            <th>Wiki page</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item) => {
            const [buyPrice, buyTrader] = getBestBuy(item);
            const [sellPrice, sellTrader] = getBestSell(item);

            return (
              <tr key={item._id}>
                {/* <td>
                  <ImageComponent
                    imgSrc={"/" + item._id + ".webp"}
                    alt={item.name}
                    width={16}
                    height={16}
                  />
                </td> */}
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
                  {buyTrader != "" && (
                    <p>
                      {buyTrader}: {buyPrice} RUB
                    </p>
                  )}
                </td>
                <td>
                  {sellTrader != "" && (
                    <p>
                      {sellTrader}: {sellPrice} RUB
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
  );
}

export default ItemScrollCompact;

"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { Item, ItemQueryParams } from "../../utils/types";
import { useState } from "react";
//import ImageComponent from "./ImageComponent";
import Link from "next/link";

interface Props {
  initItems: Item[];
  queryParams: ItemQueryParams;
}

function ItemScrollCompact({ initItems, queryParams }: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(queryParams.limit);

  const fetchItems = async () => {
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
      {allItems.map((item) => (
        <div key={item._id} className="flex gap-6">
          {/* <ImageComponent
            imgSrc={"/icons/" + item._id + ".webp"}
            alt={item.name}
            width={32}
            height={32}
          /> */}
          <Link
            className="p-1"
            href={{ pathname: "/item_view", query: "id=" + item._id }}
          >
            {item.name}
          </Link>
          <p>{item.avg24hPrice}</p>
          <p>{getBestBuy(item)}</p>
          <p>{getBestSell(item)}</p>
        </div>
      ))}
    </InfiniteScroll>
  );
}

export default ItemScrollCompact;

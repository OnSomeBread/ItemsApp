import { Buy, type Item, type Sell } from "../types";
import { type ReactNode } from "react";
import Link from "next/link";
import { DEFAULT_ITEM_QUERY_PARAMS } from "../constants";
import dynamic from "next/dynamic";
const ImageComponent = dynamic(() => import("./ImageComponent"), {
  ssr: false,
});

interface Props {
  item: Item;
  idx: number;
  fields: string[];
  height: number;
  children: ReactNode;
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTraderBuy(allTraders: Buy[]) {
  let bestBuy: Buy | null = null;
  for (const trader of allTraders) {
    if (bestBuy === null || trader.priceRUB < bestBuy.priceRUB) {
      bestBuy = trader;
    }
  }

  if (bestBuy === null) return <p className="h-8">Cannot be bought</p>;

  return (
    <p className="h-8">
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
  );
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTraderSell(allTraders: Sell[]) {
  let bestSell: Sell | null = null;
  for (const trader of allTraders) {
    if (bestSell === null || trader.priceRUB > bestSell.priceRUB) {
      bestSell = trader;
    }
  }

  if (bestSell === null) return <p className="h-8">Cannot be sold</p>;

  return (
    <p className="h-8">
      Best Sell:{" "}
      {bestSell.name + " " + bestSell.priceRUB.toLocaleString("en-us")} RUB
    </p>
  );
}

function ItemComponent({ item, idx, children, fields, height }: Props) {
  return (
    <div
      className={
        "flex-col justify-center items-center text-center border-1 border-solid board-[#ccc] rounded-[10px] pt-4 px-4 pb-1 w-[92%] h-" +
        height.toString()
      }
    >
      {fields.includes("index") && <p>{idx}</p>}
      {fields.includes("name") && (
        <p className="h-10">
          <Link href={{ pathname: "/item_view", query: "id=" + item._id }}>
            {item.name}
          </Link>
          <br />
          {item.shortName}
        </p>
      )}
      {fields.includes("icon") && (
        <div className="relative -z-1 flex h-60 w-[100%] items-center justify-center">
          <ImageComponent
            imgSrc={"/" + item._id + ".webp"}
            alt={item.name}
            priority={idx <= DEFAULT_ITEM_QUERY_PARAMS["limit"] ? true : false}
            width={64 * item.width}
            height={64 * item.height}
          />
        </div>
      )}

      {fields.includes("basePrice") && (
        <p>Base Price: {item.basePrice.toLocaleString("en-us")} RUB</p>
      )}

      {fields.includes("traders") && (
        <>
          {getBestTraderBuy(item.buys)}
          {getBestTraderSell(item.sells)}
        </>
      )}

      {children}
    </div>
  );
}

export default ItemComponent;

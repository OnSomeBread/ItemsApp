import type { Buy, Item, Sell } from "../types";
import { type ReactNode } from "react";
import Link from "next/link";
import { DEFAULT_ITEM_QUERY_PARAMS } from "../constants";
import dynamic from "next/dynamic";
import { getBestBuy, getBestSell } from "../utils";
const ImageComponent = dynamic(() => import("./ImageComponent"));

interface Props {
  item: Item;
  idx: number;
  fields: string[];
  height: number;
  children: ReactNode;
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTraderBuy(item: Item) {
  const bestBuy: Buy | null = getBestBuy(item);

  if (bestBuy === null) return <p className="h-8">Cannot be bought</p>;

  return (
    <p className="h-8">
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
  );
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTraderSell(item: Item) {
  const bestSell: Sell | null = getBestSell(item);

  if (bestSell === null) return <p className="h-8">Cannot be sold</p>;

  return (
    <p className="h-8">
      Best Sell:{" "}
      {bestSell.trader_name + " " + bestSell.price_rub.toLocaleString("en-us")}{" "}
      RUB
    </p>
  );
}

function ItemComponent({ item, idx, children, fields, height }: Props) {
  return (
    // border-1 border-solid board-[#ccc]
    <div
      className={
        "flex-col justify-center items-center shadow-[0_0_5px_rgba(0,0,0,0.3)] shadow-gray-100 text-center  rounded-[10px] pt-4 px-4 pb-1 w-[92%] h-" +
        height.toString()
      }
    >
      {fields.includes("index") && <p>{idx}</p>}
      {fields.includes("name") && (
        <p className="h-10">
          <Link href={{ pathname: "/item_view", query: "id=" + item._id }}>
            {item.item_name}
          </Link>
          <br />
          {item.short_name}
        </p>
      )}
      {fields.includes("icon") && (
        <div className="relative -z-1 flex h-60 w-[100%] items-center justify-center">
          <ImageComponent
            imgSrc={"/" + item._id + ".webp"}
            alt={item.item_name}
            priority={idx <= DEFAULT_ITEM_QUERY_PARAMS["limit"] ? true : false}
            width={64 * item.width}
            height={64 * item.height}
          />
        </div>
      )}

      {fields.includes("basePrice") && (
        <p>Base Price: {item.base_price.toLocaleString("en-us")} RUB</p>
      )}

      {fields.includes("traders") && (
        <>
          {getBestTraderBuy(item)}
          {getBestTraderSell(item)}
        </>
      )}

      {children}
    </div>
  );
}

export default ItemComponent;

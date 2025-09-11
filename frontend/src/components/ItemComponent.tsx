import { type Item, type Sell } from "../types";
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
function getBestTrader(allTraders: Sell[]) {
  if (allTraders.length === 1 && allTraders[0].name === "fleaMarket") {
    return <p></p>;
  }

  let bestTrader = "";
  let bestPrice = 0;
  for (const trader of allTraders) {
    if (trader.price > bestPrice && trader.name !== "fleaMarket") {
      bestPrice = trader.price;
      bestTrader = trader.name;
    }
  }
  return (
    <p className="h-10">
      Highest Trader Sell Price:{" "}
      {bestTrader.charAt(0).toUpperCase() + bestTrader.slice(1)}{" "}
      {bestPrice.toLocaleString("en-us")} RUB
    </p>
  );
}

// creates a few lines for the items container only if item can be sold in the flea
function getFleaPrice(item: Item) {
  for (const trader of item.sells) {
    if (trader.name === "fleaMarket") {
      return (
        <div>
          <p>Flea Price: {trader.price.toLocaleString("en-us")} RUB</p>
          {item.avg24hPrice && (
            <p>
              Average 24h Price: {item.avg24hPrice.toLocaleString("en-us")} RUB
            </p>
          )}
          {item.changeLast48hPercent !== 0 && (
            <p
              className={
                item.changeLast48hPercent < 0 ? "text-green-50" : "text-red-50"
              }
            >
              {item.changeLast48hPercent}%
            </p>
          )}
        </div>
      );
    }
  }
  return <>Cannot be sold on flea</>;
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
        <div className="relative -z-1 flex justify-center items-center w-100% h-60">
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

      {item.sells.length > 0 ? (
        <>
          {fields.includes("traders") && getBestTrader(item.sells)}
          {fields.includes("fleaMarket") && getFleaPrice(item)}
          {children}
        </>
      ) : (
        <p>Cannot be sold</p>
      )}
    </div>
  );
}

export default ItemComponent;

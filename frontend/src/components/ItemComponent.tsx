import { type Item, type Sell } from "../types";
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_ITEM_QUERY_PARAMS } from "../constants";

interface Props {
  item: Item;
  idx: number;
  fields: string[];
  children: ReactNode;
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTrader(allTraders: Sell[]) {
  if (allTraders.length == 1 && allTraders[0].source == "fleaMarket") {
    return <p></p>;
  }

  let bestTrader = "";
  let bestPrice = 0;
  for (const trader of allTraders) {
    if (trader.price > bestPrice && trader.source != "fleaMarket") {
      bestPrice = trader.price;
      bestTrader = trader.source;
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
    if (trader.source == "fleaMarket") {
      return (
        <>
          <p>Flea Price: {trader.price.toLocaleString("en-us")} RUB</p>
          {item.avg24hPrice && (
            <p>
              Average 24h Price: {item.avg24hPrice.toLocaleString("en-us")} RUB
            </p>
          )}
          {item.changeLast48hPercent != 0 && (
            <p
              className={
                item.changeLast48hPercent < 0 ? "text-green-50" : "text-red-50"
              }
            >
              {item.changeLast48hPercent}%
            </p>
          )}
        </>
      );
    }
  }
  return <>Cannot be sold on flea</>;
}

function ItemComponent({ item, idx, children, fields }: Props) {
  return (
    <div className="flex-col items-center text-center border-1 border-solid board-[#ccc] rounded-[10px] pt-4 px-4 pb-1 w-[92%]">
      {fields.includes("index") && <p>{idx}</p>}
      {fields.includes("name") && (
        <Link to="/item_view" state={item}>
          <p className="h-10">{item.name}</p>
        </Link>
      )}
      {fields.includes("shortName") && <p>{item.shortName}</p>}
      {fields.includes("icon") && (
        <div className="flex justify-center items-center w-100% h-40">
          <img
            className="object-contain max-w-100% max-h-40"
            loading={
              idx >= DEFAULT_ITEM_QUERY_PARAMS["limit"] ? "lazy" : "eager"
            }
            fetchPriority={
              idx >= DEFAULT_ITEM_QUERY_PARAMS["limit"] ? "low" : "high"
            }
            src={"/icons/" + item._id + ".webp"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/icons/unknown.webp";
            }}
            alt={item.name}
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

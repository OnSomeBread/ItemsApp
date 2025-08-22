import { type Item, type Sell } from "../types";
import "../App.css";
import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

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
    <p>
      Highest Trader Sell Price:{" "}
      {bestTrader.charAt(0).toUpperCase() + bestTrader.slice(1)}{" "}
      {bestPrice.toLocaleString("en-us")} RUB
    </p>
  );
}

// creates a few lines for the items container only if item can be sold in the flea
function getFleaPrice({ item, children }: Props) {
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
              style={{ color: item.changeLast48hPercent < 0 ? "green" : "red" }}
            >
              {item.changeLast48hPercent}%
            </p>
          )}
          {children}
        </>
      );
    }
  }
  return <>Cannot be sold on flea</>;
}

function ItemComponent({ item, idx, children, fields }: Props) {
  const navigate = useNavigate();

  return (
    <div className="item">
      {fields.includes("name") && (
        <a onClick={() => navigate("/item_view", { state: item })}>
          <p>{item.name}</p>
        </a>
      )}
      {fields.includes("shortName") && <p>{item.shortName}</p>}
      {fields.includes("basePrice") && (
        <p>Base Price: {item.basePrice.toLocaleString("en-us")} RUB</p>
      )}
      {fields.includes("icon") && <img src={"/icons/" + item._id + ".png"} />}

      {item.sells.length > 0 ? (
        <>
          {fields.includes("traders") && getBestTrader(item.sells)}
          {fields.includes("fleaMarket") &&
            getFleaPrice({ item, idx, children, fields })}
        </>
      ) : (
        <p>Cannot be sold</p>
      )}
    </div>
  );
}

export default ItemComponent;

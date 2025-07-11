import type { Item, Sell } from "../constants";
import "../App.css";
import type { ReactNode } from "react";

interface Props {
  item: Item;
  idx: number;
  children: ReactNode;
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTrader(allTraders: Sell[]) {
  if (allTraders.length == 1 && allTraders[0].source == "fleaMarket") {
    return <></>;
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
    <>
      Best Trader Price:{" "}
      {bestTrader.charAt(0).toUpperCase() + bestTrader.slice(1)} {bestPrice} RUB
    </>
  );
}

// creates a few lines for the items container only if item can be sold in the flea
function getFleaPrice({ item, children }: Props) {
  for (const trader of item.sells) {
    if (trader.source == "fleaMarket") {
      return (
        <>
          <p>Flea Price: {trader.price} RUB</p>
          <p>Average 24h Price: {item.avg24hPrice} RUB</p>
          <p style={{ color: item.changeLast48hPercent < 0 ? "green" : "red" }}>
            {item.changeLast48hPercent}%
          </p>
          {children}
        </>
      );
    }
  }
  return <>Cannot be sold on flea</>;
}

function ItemComponent({ item, idx, children }: Props) {
  return (
    <div className="item">
      <p>{item.name}</p>
      <p>{item.shortName}</p>
      <p>Base Price: {item.basePrice} RUB</p>

      {item.sells.length > 0 ? (
        <>
          <p>{getBestTrader(item.sells)}</p>
          {getFleaPrice({ item, idx, children })}
        </>
      ) : (
        <p>Cannot be sold</p>
      )}
    </div>
  );
}

export default ItemComponent;

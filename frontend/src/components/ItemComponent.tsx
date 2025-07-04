import type { Item, Sell } from "../constants";

interface Props {
  item: Item;
}

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

function getFleaPrice(item: Item) {
  for (const trader of item.sells) {
    if (trader.source == "fleaMarket") {
      return (
        <>
          <p>Flea Price: {trader.price} RUB</p>
          <p>Average 24h Price: {item.avg24hPrice} RUB</p>
          <p style={{ color: item.changeLast48hPercent < 0 ? "red" : "green" }}>
            {item.changeLast48hPercent}%
          </p>
        </>
      );
    }
  }
  return <>Cannot be sold on flea</>;
}

function ItemComponent({ item }: Props) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "1rem",
        borderRadius: "10px",
        width: "250px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <p>Name: {item.name}</p>
      <p>Short Name: {item.shortName}</p>
      <p>Base Price: {item.basePrice} RUB</p>

      {item.sells.length > 0 ? (
        <>
          <p>{getBestTrader(item.sells)}</p>
          {getFleaPrice(item)}
        </>
      ) : (
        <p>Cannot be sold</p>
      )}
    </div>
  );
}

export default ItemComponent;

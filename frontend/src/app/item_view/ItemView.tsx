import { DOCKER_BACKEND } from "../../constants";
import type { Item, ItemHistory } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import ImageComponent from "../../components/ImageComponent";
import dynamic from "next/dynamic";

const ItemChart = dynamic(() => import("../../components/ItemChart"));

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

async function ItemView({ searchParams }: PageProps) {
  const { id } = (await searchParams) ?? { id: undefined };
  if (id === undefined) return <p>no item passed in</p>;

  const res1 = await fetch(DOCKER_BACKEND + "/api/item_ids?ids=" + id, {
    cache: "no-store",
  });
  const item = ((await res1.json()) as Item[])[0];

  const res2 = await fetch(
    DOCKER_BACKEND + "/api/item_history?itemId=" + item._id,
    {
      cache: "no-store",
    }
  );
  const itemHistory = (await res2.json()) as ItemHistory[];
  item.buys = item.buys.filter((buy) => buy.trader_name !== "Flea Market");

  return (
    <>
      <PageSwitch />
      <div className="md:flex">
        <div className="flex-1 p-10">
          <p>{item.item_name}</p>
          <p>item short name: {item.short_name}</p>
          <p>
            item size width x height: {item.width}x{item.height}
          </p>
          <ImageComponent
            imgSrc={"/" + item._id + ".webp"}
            alt={item.item_name}
            priority={true}
            width={64 * item.width}
            height={64 * item.height}
          />
          <p>{item.item_types}</p>
          {item.avg_24h_price !== 0 && (
            <p>
              item average 24 hour price:{" "}
              {item.avg_24h_price.toLocaleString("en-us")} RUB
            </p>
          )}
          <p>item base price: {item.base_price.toLocaleString("en-us")} RUB</p>
          <p>change last 48 hours: {item.change_last_48h_percent}%</p>

          <a href={item.wiki}>
            <p>{item.item_name} wiki page</p>
          </a>

          <p>
            Buy From Flea Sell To Trader Instant Profit:{" "}
            {item.buy_from_flea_instant_profit.toLocaleString("en-us")} RUB
          </p>

          <p>
            Buy From Trader Sell To Flea Instant Profit:{" "}
            {item.buy_from_trader_instant_profit.toLocaleString("en-us")} RUB
          </p>

          {item.sells && item.sells.length > 0 && (
            <>
              <br />
              <p>Sell Prices</p>
              {item.sells.map((sellFor) => (
                <p key={sellFor.trader_name}>
                  {sellFor.trader_name +
                    ": " +
                    sellFor.price_rub.toLocaleString("en-us")}{" "}
                  RUB
                </p>
              ))}
            </>
          )}

          {item.buys && item.buys.length > 0 && (
            <>
              <br />
              <p>Buy Prices</p>
              {item.buys.map((buyFor) => (
                <p key={buyFor.trader_name}>
                  {"buy " +
                    buyFor.buy_limit +
                    " from " +
                    buyFor.trader_name +
                    " lvl " +
                    buyFor.min_trader_level +
                    ": " +
                    buyFor.price.toLocaleString("en-us") +
                    " " +
                    buyFor.currency}
                </p>
              ))}
            </>
          )}
        </div>
        <div className="flex-3 p-10">
          {itemHistory && itemHistory.length > 0 && (
            <ItemChart itemHistory={itemHistory} />
          )}
        </div>
      </div>
    </>
  );
}

export default ItemView;

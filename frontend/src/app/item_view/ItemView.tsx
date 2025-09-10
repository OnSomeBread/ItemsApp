import { ALL_ITEM_TYPES, DOCKER_BACKEND } from "../../constants";
import ItemChart from "../../components/ItemChart";
import { type Item, type ItemHistory, type ItemType } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import ImageComponent from "../../components/ImageComponent";
import { Suspense } from "react";

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
    DOCKER_BACKEND + "/api/item_history?item_id=" + item._id,
    {
      cache: "no-store",
    }
  );
  const data = (await res2.json()) as ItemHistory[];
  const itemHistory = data.map((d: ItemHistory) => ({
    ...d,
    time: new Date(`2025-01-01T${String(d.time)}Z`),
  }));

  return (
    <>
      <PageSwitch />
      <div className="md:flex">
        <div className="p-10 flex-1">
          <p>{item.name}</p>
          <p>item short name: {item.shortName}</p>
          <p>
            item size width x height: {item.width}x{item.height}
          </p>
          <Suspense fallback={<article aria-busy="true" />}>
            <ImageComponent
              imgSrc={"/" + item._id + ".webp"}
              alt={item.name}
              width={64 * item.width}
              height={64 * item.height}
            />
          </Suspense>
          {item.itemtypes && item.itemtypes.length > 0 && (
            <p>
              item types:{" "}
              {item.itemtypes
                .map(
                  (t: ItemType) =>
                    ALL_ITEM_TYPES[t.name as keyof typeof ALL_ITEM_TYPES]
                )
                .join(", ")}
            </p>
          )}
          {item.avg24hPrice && (
            <p>
              item average 24 hour price:{" "}
              {item.avg24hPrice.toLocaleString("en-us")}
            </p>
          )}
          <p>item base price: {item.basePrice.toLocaleString("en-us")}</p>
          <p>change last 48 hours: {item.changeLast48hPercent}%</p>

          <a href={item.link}>
            <p>{item.name} wiki page</p>
          </a>

          {item.sells && item.sells.length > 0 && (
            <>
              <br></br>
              <p>Sell Prices</p>
              {item.sells.map((sellFor) => (
                <p key={sellFor.name}>
                  {sellFor.name +
                    ": " +
                    sellFor.priceRUB.toLocaleString("en-us")}
                </p>
              ))}
            </>
          )}

          {item.buys && item.buys.length > 0 && (
            <>
              <br></br>
              <p>Buy Prices</p>
              {item.buys.map((buyFor) => (
                <p key={buyFor.name}>
                  {buyFor.name + ": " + buyFor.priceRUB.toLocaleString("en-us")}
                </p>
              ))}
            </>
          )}
        </div>
        <div className="p-10 flex-3">
          <p>
            Item Price History Chart{" "}
            <mark>
              WARNING CURRENT WIPE DOES NOT HAVE FLEA SO IT ALWAYS DISPLAYS AT A
              CONSTANT PRICE
            </mark>
          </p>
          <Suspense fallback={<article aria-busy="true" />}>
            {itemHistory && <ItemChart itemHistory={itemHistory} />}
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default ItemView;

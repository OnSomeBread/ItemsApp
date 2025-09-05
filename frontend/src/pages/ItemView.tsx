import { useLocation } from "react-router-dom";
import { ALL_ITEM_TYPES } from "../constants";
import { useEffect, useState } from "react";
import ItemChart from "../components/ItemChart";
import api from "../api";
import type { Item, ItemHistory, ItemType } from "../types";
import PageSwitch from "../components/PageSwitch";

function ItemView() {
  const location = useLocation();
  const item = location.state as Item;
  const [itemHistory, setItemHistory] = useState<ItemHistory[] | null>(null);

  // go to api endpoint item_history and grab prev flea market data
  useEffect(() => {
    api
      .get<ItemHistory[]>("/api/item_history?item_id=" + item._id)
      .then((response) => {
        if (response.data === undefined || response.data.length === 0) return;

        // set all of the dates to a proper format using junkdate since it wont
        // be used in the graph
        const itemHistoryArr = response.data.map((d) => ({
          ...d,

          time: new Date(`2025-01-01T${d.time}Z`),
        }));

        setItemHistory(itemHistoryArr);
      });
  }, [item._id]);

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
          <img
            src={"/icons/" + item._id + ".webp"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/icons/unknown.webp";
            }}
          />
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

          {item.sells && (
            <>
              <br></br>
              <p>Sell Prices</p>
              {item.sells.map((sellFor) => (
                <p key={sellFor.source}>
                  {sellFor.source +
                    ": " +
                    sellFor.price.toLocaleString("en-us")}
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
          {itemHistory && <ItemChart itemHistory={itemHistory} />}
        </div>
      </div>
    </>
  );
}

export default ItemView;

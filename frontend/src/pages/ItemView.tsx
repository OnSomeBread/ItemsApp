import { useLocation } from "react-router-dom";
import { ON_MOBILE, type Item, type ItemHistory } from "../constants";
import { useEffect, useState } from "react";
import ItemChartComponent from "../components/ItemChartComponent";
import api from "../api";

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
    <div
      className={ON_MOBILE ? "" : "div-align"}
      style={ON_MOBILE ? {} : { display: "flex" }}
    >
      <div style={{ flex: 1, padding: 30 }}>
        <p>{item.name}</p>
        <p>item short name: {item.shortName}</p>
        {item.types && (
          <p>item types: {item.types.map((t) => t.name).join(", ")}</p>
        )}
        {item.avg24hPrice && (
          <p>
            item average 24 hour price:{" "}
            {item.avg24hPrice.toLocaleString("en-us")}
          </p>
        )}
        <p>item base price: {item.basePrice.toLocaleString("en-us")}</p>
        <p>change last 48 hours: {item.changeLast48hPercent}%</p>
        <p>item width: {item.width}</p>
        <p>item height: {item.height}</p>
        <a href={item.link}>
          <p>{item.name} wiki page</p>
        </a>

        {item.sells && (
          <>
            <p>Sell Prices:</p>
            {item.sells.map((sellFor) => (
              <p key={sellFor.source}>
                {sellFor.source + ": " + sellFor.price.toLocaleString("en-us")}
              </p>
            ))}
          </>
        )}
      </div>
      <div style={{ flex: 3, padding: 10 }}>
        <p>
          Item Price History Chart{" "}
          <mark>
            WARNING CURRENT WIPE DOES NOT HAVE FLEA SO IT ALWAYS DISPLAYS AT A
            CONSTANT PRICE
          </mark>
        </p>
        <ItemChartComponent itemHistory={itemHistory ?? []} />
      </div>
    </div>
  );
}

export default ItemView;

import { useLocation } from "react-router-dom";
import { type Item, type ItemHistory } from "../constants";
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
    <div style={{ padding: 30 }}>
      <p>{item.name}</p>
      <p>item short name: {item.shortName}</p>
      {item.types && (
        <p>item types: {item.types.map((t) => t.name).join(", ")}</p>
      )}
      <p>item average 24 hour price: {item.avg24hPrice}</p>
      <p>item base price: {item.basePrice}</p>
      <p>change last 48 hours: {item.changeLast48hPercent}%</p>
      <p>item width: {item.width}</p>
      <p>item height: {item.height}</p>
      <a href={item.link}>
        <p>{item.name} wiki page</p>
      </a>

      {item.sells && (
        <p>
          Sell Prices:{" "}
          {item.sells
            .map((sellFor) => sellFor.source + ": " + sellFor.price.toString())
            .join(", ")}
        </p>
      )}

      <p>Item Price History Chart</p>
      <p>
        <mark>
          WARNING CURRENT WIPE DOES NOT HAVE FLEA SO IT ALWAYS DISPLAYS AT A
          CONSTANT PRICE
        </mark>
      </p>
      <ItemChartComponent itemHistory={itemHistory ?? []} />
    </div>
  );
}

export default ItemView;

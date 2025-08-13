import { useLocation } from "react-router-dom";
import { BACKEND_ADDRESS, type Item, type ItemHistory } from "../constants";
import axios from "axios";
import { useEffect, useState } from "react";
import ItemChartComponent from "../components/ItemChartComponent";

function ItemView() {
  const location = useLocation();
  const item = location.state as Item;
  const [itemHistory, setItemHistory] = useState<ItemHistory[] | null>(null);

  // go to api endpoint item_history and grab prev flea market data
  useEffect(() => {
    axios
      .get<ItemHistory[]>(
        BACKEND_ADDRESS + "/api/item_history?item_id=" + item._id
      )
      .then((response) => {
        if (response.data === undefined) return;
        if (response.data.length > 0) {
          const itemHistoryArr = response.data.map((d) => ({
            ...d,

            time: new Date(`2025-08-01T${d.time}Z`),
          }));

          console.log(itemHistoryArr[0].time);

          setItemHistory(itemHistoryArr);
        }
      });
  }, [item._id]);

  return (
    <div>
      <ItemChartComponent itemHistory={itemHistory ?? []} />
    </div>
  );
}

export default ItemView;

import axios from "axios";
import type { Item } from "../constants";
import { useEffect, useState } from "react";
import ItemComponent from "../components/ItemComponent";
import Loading from "../components/Loading";

function DisplayCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  const params = new URLSearchParams();
  const keys = Object.keys(localStorage);
  keys.forEach((key: string) => {
    params.append("ids", key);
  });
  const BACKEND_ADDRESS: string = import.meta.env.VITE_BACKEND_SERVER as string;

  const q = BACKEND_ADDRESS + "/api/cart?" + params.toString();

  useEffect(() => {
    axios
      .get<Item[]>(q)
      .then((response) => {
        setAllItems(response.data);
      })
      .catch((err) => console.log(err));
  }, [q]);

  if (allItems === null) {
    return <Loading />;
  }
  if (allItems.length === 0) {
    return <p>cart is empty</p>;
  }

  const getTotalFleaPrice = () => {
    let total = 0;
    allItems.forEach((item) => {
      for (const sell of item.sells) {
        if (sell.source === "fleaMarket") {
          total += sell.price * parseInt(localStorage.getItem(item._id) || "0");
        }
      }
    });
    return total;
  };

  const displayItems = ["name", "fleaMarket"];

  return (
    <>
      <div>
        <p>total fleaPrice: {getTotalFleaPrice()}</p>
      </div>

      <div className="list_item">
        {allItems.map((x, i) => (
          <ItemComponent item={x} idx={i} fields={displayItems}>
            <p>count: {localStorage.getItem(x._id)}</p>
          </ItemComponent>
        ))}
      </div>
    </>
  );
}

export default DisplayCart;

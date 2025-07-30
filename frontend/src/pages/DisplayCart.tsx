import axios from "axios";
import { BACKEND_ADDRESS, type Item } from "../constants";
import { useEffect, useState } from "react";
import ItemComponent from "../components/ItemComponent";
import { AnimatePresence, motion } from "framer-motion";

function DisplayCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  const params = new URLSearchParams();
  const keys = Object.keys(localStorage);
  keys.forEach((key: string) => {
    const [page, _id] = key.split("-");
    if (page === "item") params.append("ids", _id);
  });

  const query = BACKEND_ADDRESS + "/api/cart?" + params.toString();

  useEffect(() => {
    axios
      .get<Item[]>(query)
      .then((response) => {
        console.log(response.data);
        response.data.sort((itema, itemb) =>
          itema._id.localeCompare(itemb._id)
        );
        console.log(response.data);
        setAllItems(response.data);
      })
      .catch((err) => console.log(err));
  }, [query]);

  const getTotalFleaPrice = () => {
    let totalFleaPrice = 0;
    //const prevTotal = parseInt(localStorage.getItem("prevFleaMarket") || "0");
    allItems?.forEach((item) => {
      for (const sell of item.sells) {
        if (sell.source === "fleaMarket") {
          totalFleaPrice +=
            sell.price *
            parseInt(localStorage.getItem("item-" + item._id) || "0");
          break;
        }
      }
    });
    localStorage.setItem("FleaMarketDiff", totalFleaPrice.toString());
    return totalFleaPrice;
  };

  return (
    <>
      <p>Total Flea Market Price</p>
      <div className="div-align">
        <p>{getTotalFleaPrice().toLocaleString("en-us")} RUB</p>
        {/* TODO ADD A +AMOUNT ANIMATION
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {0}
        </motion.p> */}
      </div>

      <motion.div
        className="list_item"
        initial={{ x: 200 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <AnimatePresence>
          {allItems?.map((x, i) => (
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <ItemComponent
                key={x._id + i.toString()}
                item={x}
                idx={i}
                fields={["name", "fleaMarket"]}
              >
                <p>count: {localStorage.getItem("item-" + x._id)}</p>
              </ItemComponent>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default DisplayCart;

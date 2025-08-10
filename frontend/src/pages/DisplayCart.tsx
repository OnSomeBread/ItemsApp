import axios from "axios";
import { BACKEND_ADDRESS, type Item } from "../constants";
import { useEffect, useState } from "react";
import ItemComponent from "../components/ItemComponent";
import { AnimatePresence, motion } from "framer-motion";

function DisplayCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  const params = new URLSearchParams();
  Object.keys(localStorage).forEach((key: string) => {
    if (key.startsWith("item")) {
      const id = key.slice("item-".length);
      if (id !== "prevFleaMarket") params.append("ids", id);
    }
  });

  const query = BACKEND_ADDRESS + "/api/item_ids?" + params.toString();
  const count = params.getAll("ids").length;

  useEffect(() => {
    if (count === 0) {
      setAllItems(null);
      return;
    }
    axios
      .get<Item[]>(query)
      .then((response) => {
        // sort all of the items by when they where added to the cart ascending
        response.data.sort((itema, itemb) => {
          const timea = parseInt(
            localStorage.getItem("date-added-item-" + itema._id) || "0"
          );
          const timeb = parseInt(
            localStorage.getItem("date-added-item-" + itemb._id) || "0"
          );
          return timea - timeb;
        });
        setAllItems(response.data);
      })
      .catch((err) => console.log(err));
  }, [query, count]);

  // goes through all items and finds its count in localstorage which is set in DisplayItems changeCount used in buttons
  // returns both the current flea price and the previous flea price
  const getTotalFleaPrice = () => {
    const prevTotal = parseInt(
      localStorage.getItem("item-prevFleaMarket") || "0"
    );
    let totalFleaPrice = 0;

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

    return [totalFleaPrice, prevTotal];
  };

  const [currPrice, prevPrice] = getTotalFleaPrice();

  useEffect(() => {
    localStorage.setItem("item-prevFleaMarket", currPrice.toString());
  }, [currPrice]);

  return (
    <>
      <p>Total Flea Market Price</p>
      <div className="div-align">
        <p>{currPrice.toLocaleString("en-us")} RUB</p>
        {currPrice > prevPrice && (
          <motion.p
            key={currPrice}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.2,
              times: [0, 0.1, 0.9, 1],
            }}
            style={{ color: "green" }}
          >
            +{(currPrice - prevPrice)?.toLocaleString("en-us")}
          </motion.p>
        )}
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
              key={x._id + i.toString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ listStyleType: "none", padding: 2 }}
            >
              <ItemComponent item={x} idx={i} fields={["name", "fleaMarket"]}>
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

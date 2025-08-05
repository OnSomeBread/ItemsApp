import axios from "axios";
import { BACKEND_ADDRESS, type Item } from "../constants";
import { useEffect, useState } from "react";
import ItemComponent from "../components/ItemComponent";
import { AnimatePresence, motion } from "framer-motion";

function DisplayCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  const params = new URLSearchParams();
  Object.keys(localStorage).forEach((key: string) => {
    const [page, _id] = key.split("-");
    if (page === "item") params.append("ids", _id);
  });

  const query = BACKEND_ADDRESS + "/api/cart?" + params.toString();
  const count = params.getAll("ids").length;

  useEffect(() => {
    if (count === 0) {
      setAllItems(null);
      return;
    }
    axios
      .get<Item[]>(query)
      .then((response) => {
        // the caching system can sometimes change the order of which ids are passed in and this helps to normalize it
        // in theory this should sort by the main page sortBy query param however that complicates the page too much
        // for how little it changes
        response.data.sort((itema, itemb) =>
          itema._id.localeCompare(itemb._id)
        );
        setAllItems(response.data);
      })
      .catch((err) => console.log(err));
  }, [query, count]);

  // goes through all items and finds its count in localstorage which is set in DisplayItems changeCount used in buttons
  // returns both the current flea price and the previous flea price
  const getTotalFleaPrice = () => {
    const prevTotal = parseInt(localStorage.getItem("prevFleaMarket") || "0");
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
    localStorage.setItem("prevFleaMarket", currPrice.toString());
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

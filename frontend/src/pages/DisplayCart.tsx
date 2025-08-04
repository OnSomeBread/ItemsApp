import axios from "axios";
import { BACKEND_ADDRESS, type Item } from "../constants";
import { useEffect, useState } from "react";
import ItemComponent from "../components/ItemComponent";
import { AnimatePresence, motion } from "framer-motion";

const getTotalFleaPrice = (allItems: Item[]) => {
  const prevTotal = parseInt(localStorage.getItem("prevFleaMarket") || "0");
  let totalFleaPrice = 0;

  allItems.forEach((item) => {
    for (const sell of item.sells) {
      if (sell.source === "fleaMarket") {
        totalFleaPrice +=
          sell.price *
          parseInt(localStorage.getItem("item-" + item._id) || "0");
        break;
      }
    }
  });

  localStorage.setItem("prevFleaMarket", totalFleaPrice.toString());
  return [totalFleaPrice, prevTotal];
};

function DisplayCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [currFleaPrice, setCurrFleaPrice] = useState<number>(0);
  const [priceDelta, setPriceDelta] = useState<number | null>(null);

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
        response.data.sort((itema, itemb) =>
          itema._id.localeCompare(itemb._id)
        );
        setAllItems(response.data);
        const [currPrice, prevPrice] = getTotalFleaPrice(response.data);
        setCurrFleaPrice(currPrice);

        if (currPrice > prevPrice) {
          setPriceDelta(currPrice - prevPrice);
          //setTimeout(() => setPriceDelta(null), 1000);
        }
      })
      .catch((err) => console.log(err));
  }, [query]);

  return (
    <>
      <p>Total Flea Market Price</p>
      <div className="div-align">
        <p>{currFleaPrice.toLocaleString("en-us")} RUB</p>
        <motion.p
          key={priceDelta}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.6,
            times: [0, 0.1, 0.9, 1],
          }}
          style={{ color: "green" }}
        >
          +{priceDelta?.toLocaleString("en-us")}
        </motion.p>
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
              transition={{ duration: 0.7, ease: "easeOut" }}
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

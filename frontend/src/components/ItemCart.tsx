import { useEffect, useState } from "react";
import ItemComponent from "./ItemComponent";
import { AnimatePresence, motion } from "framer-motion";
import type { Item } from "../types";
import api from "../api";

function ItemCart() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  const params = new URLSearchParams();
  if (typeof window !== "undefined") {
    Object.keys(localStorage).forEach((key: string) => {
      if (key.startsWith("item")) {
        const id = key.slice("item-".length);
        if (id !== "prevTotalPrice") params.append("ids", id);
      }
    });
  }

  const query = "/api/item_ids?" + params.toString();
  const count = params.getAll("ids").length;

  useEffect(() => {
    if (count === 0) {
      setAllItems(null);
      return;
    }
    api
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
      .catch((err) => console.error(err));
  }, [query, count]);

  // goes through all items and finds its count in localstorage which is set in DisplayItems changeCount used in buttons
  // returns both the current flea price and the previous flea price
  const getTotalFleaPrice = () => {
    if (typeof window === "undefined") return [0, 0, 0, 0];
    const prevTotalBuy = parseInt(
      localStorage.getItem("item-prevTotalBuy") || "0"
    );
    const prevTotalSell = parseInt(
      localStorage.getItem("item-prevTotalSell") || "0"
    );
    let totalBuyPrice = 0;
    let totalSellPrice = 0;

    allItems?.forEach((item) => {
      let bestBuyPrice = Number.MAX_SAFE_INTEGER;
      let bestSellPrice = 0;
      for (const buy of item.buys) {
        if (buy.trader_name === "Flea Market") continue;
        bestBuyPrice = Math.min(bestBuyPrice, buy.price_rub);
      }
      for (const sell of item.sells) {
        bestSellPrice = Math.max(bestSellPrice, sell.price_rub);
      }
      const count = parseInt(localStorage.getItem("item-" + item._id) || "0");

      totalSellPrice += bestSellPrice * count;
      totalBuyPrice +=
        (bestBuyPrice === Number.MAX_SAFE_INTEGER ? 0 : bestBuyPrice) * count;
    });

    return [totalSellPrice, prevTotalSell, totalBuyPrice, prevTotalBuy];
  };

  const [currSellPrice, prevTotalSell, currBuyPrice, prevTotalBuy] =
    getTotalFleaPrice();

  // this allows the user to stack +money that resets after timeout period
  useEffect(() => {
    const prevTimeout = setTimeout(() => {
      localStorage.setItem("item-prevTotalSell", currSellPrice.toString());
      localStorage.setItem("item-prevTotalBuy", currBuyPrice.toString());
    }, 400);
    return () => clearTimeout(prevTimeout);
  }, [currSellPrice, currBuyPrice]);

  const moneyColorB = currBuyPrice >= prevTotalBuy ? "green" : "red";
  const signB = currBuyPrice > prevTotalBuy ? "+" : "";

  const moneyColorS = currSellPrice >= prevTotalSell ? "green" : "red";
  const signS = currSellPrice > prevTotalSell ? "+" : "";

  return (
    <div className="p-4">
      {currBuyPrice === 0 && currSellPrice === 0 ? (
        <>
          <p>Add items to show here</p>
          <br />
          <br />
          <br />
          <br />
          <br />
        </>
      ) : (
        <>
          <p>Total Buy Price</p>
          <div className="flex justify-between pr-7">
            <p>{currBuyPrice.toLocaleString("en-us")} RUB</p>
            {currBuyPrice !== prevTotalBuy && (
              <motion.p
                key={currBuyPrice}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1,
                  times: [0, 0.1, 0.9, 1],
                }}
                style={{ color: moneyColorB }}
              >
                {signB}
                {(currBuyPrice - prevTotalBuy)?.toLocaleString("en-us")}
              </motion.p>
            )}
          </div>
          <p>Total Sell Price</p>
          <div className="flex justify-between pr-7">
            <p>{currSellPrice.toLocaleString("en-us")} RUB</p>
            {currSellPrice !== prevTotalSell && (
              <motion.p
                key={currSellPrice}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1,
                  times: [0, 0.1, 0.9, 1],
                }}
                style={{ color: moneyColorS }}
              >
                {signS}
                {(currSellPrice - prevTotalSell)?.toLocaleString("en-us")}
              </motion.p>
            )}
          </div>
        </>
      )}

      <motion.div
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
              className="!grid !grid-cols-[repeat(auto-fill,minmax(275px,1fr))] gap-2 p-1"
            >
              <ItemComponent
                item={x}
                idx={i}
                fields={["name", "traders", "icon"]}
                height={100}
              >
                <p>
                  count:{" "}
                  {typeof window === "undefined"
                    ? 0
                    : localStorage.getItem("item-" + x._id)}
                </p>
              </ItemComponent>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default ItemCart;

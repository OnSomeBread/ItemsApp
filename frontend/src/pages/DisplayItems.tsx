import type { Item, ItemQueryParams } from "../constants";
import { BACKEND_ADDRESS, DISPLAY_ITEM_KEYS } from "../constants";
import { useState, useEffect } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import Buttons from "../components/Buttons";
import { lazy } from "react";
import DisplayCart from "./DisplayCart";
import { AnimatePresence, motion } from "framer-motion";
import ItemSearchBarComponent from "../components/ItemSearchBarComponent.tsx";

const ItemComponentPreview = lazy(
  () => import("../components/ItemComponent.tsx")
);

function DisplayItems() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [queryParams, setQueryParams] = useState<ItemQueryParams>({
    search: "",
    asc: "-",
    sortBy: "fleaMarket",
    type: "any",
    limit: 50,
    offset: 50,
  });
  const changeQueryParams = (key: string, value: string | number) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    // offset gets skipped for use effect grab since it creates dependency hell and best to add it for scrolling
    if (key === "offset") continue;
    params.append(key, value.toString());
  }
  const query = BACKEND_ADDRESS + "/api/items?" + params.toString();

  // grabs the first page of items based on the search params
  useEffect(() => {
    axios
      .get<Item[]>(query)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem("item-" + item._id) || "0"),
          };
        });
        setAllItems(newItems);
        setHasMore(newItems.length === queryParams.limit);
      })
      .catch((err) => console.log(err));
  }, [query, queryParams.limit]);

  // used for the infinite scroll to grab more items
  const getMoreItems = () => {
    axios
      .get<Item[]>(query + "&offset=" + queryParams.offset)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem("item-" + item._id) || "0"),
          };
        });
        setAllItems((prev) => [...(prev ?? []), ...newItems]);
        setHasMore(newItems.length == queryParams.limit);
        changeQueryParams("offset", queryParams.offset + queryParams.limit);
      })
      .catch((err) => console.log(err));
  };

  // this function is called when the buttons are pressed to change the value of a specific item in local storage
  const changeCount = (idx: number, newNumber: number) => {
    setAllItems(
      allItems?.map((item, index) => {
        if (index === idx) {
          if (newNumber === 0) {
            localStorage.removeItem("item-" + item._id);
          } else {
            localStorage.setItem("item-" + item._id, newNumber.toString());
          }
          return { ...item, count: newNumber };
        } else {
          return item;
        }
      }) || null
    );
  };

  const clearCounts = () => {
    for (const key of Object.keys(localStorage)) {
      const [page, _id] = key.split("-");
      if (page === "item") localStorage.removeItem(page + "-" + _id);
    }
    if (allItems === null) {
      return;
    }
    setAllItems(
      allItems.map((item) => {
        return { ...item, count: 0 };
      })
    );
  };

  const containerVariants = {
    show: { transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  };

  return (
    <>
      <ItemSearchBarComponent
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        clearCounts={clearCounts}
      />
      <div className="items-container">
        <InfiniteScroll
          dataLength={allItems?.length ?? 0}
          next={getMoreItems}
          hasMore={hasMore}
          loader={<></>}
        >
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="list-item"
          >
            <AnimatePresence>
              {allItems?.map((x, i) => (
                <motion.li
                  key={x._id}
                  transition={{ duration: 0.8 }}
                  variants={itemVariants}
                >
                  <ItemComponentPreview
                    item={x}
                    idx={i}
                    fields={DISPLAY_ITEM_KEYS}
                  >
                    <Buttons
                      item={x}
                      idx={i}
                      onChangeCount={changeCount}
                    ></Buttons>
                  </ItemComponentPreview>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </InfiniteScroll>
        <div>
          <DisplayCart />
        </div>
      </div>
    </>
  );
}

export default DisplayItems;

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
import { clearPageLocalStorage } from "../utils.ts";

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
    offset: 0,
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

  const fetchItems = (offset: number) => {
    axios
      .get<Item[]>(query + "&offset=" + offset)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem("item-" + item._id) || "0"),
          };
        });
        if (offset === 0) {
          setAllItems(newItems);
        } else {
          setAllItems((prev) => [...(prev ?? []), ...newItems]);
        }

        setHasMore(newItems.length == queryParams.limit);
        changeQueryParams("offset", offset + queryParams.limit);
      })
      .catch((err) => console.log(err));
  };

  // grabs the first page of items based on the search params
  useEffect(() => {
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, queryParams.limit]);

  // used for the infinite scroll to grab more items
  const getMoreItems = () => {
    fetchItems(queryParams.offset);
  };

  // this function is called when the buttons are pressed to change the value of a specific item in local storage
  const changeCount = (idx: number, newNumber: number) => {
    setAllItems(
      allItems?.map((item, index) => {
        if (index !== idx) return item;

        if (newNumber === 0) {
          localStorage.removeItem("item-" + item._id);
          localStorage.removeItem("date-added-item-" + item._id);
        } else {
          localStorage.setItem("item-" + item._id, newNumber.toString());
          localStorage.setItem(
            "date-added-item-" + item._id,
            Date.now().toString()
          );
        }
        return { ...item, count: newNumber };
      }) || null
    );
  };

  // only deletes the keys for this page
  const clearCounts = () => {
    clearPageLocalStorage("item");
    clearPageLocalStorage("date-added-item");
    setAllItems(
      allItems?.map((item) => {
        return { ...item, count: 0 };
      }) || null
    );
  };

  const containerVarients = {
    show: {
      transition: {
        staggerChildren:
          // first load has a stagger animation but when infinite scrolling its turned off
          allItems && allItems.length > queryParams.limit ? 0 : 0.04,
      },
    },
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
          <AnimatePresence>
            <motion.ul
              key={allItems?.length}
              variants={containerVarients}
              initial="hidden"
              animate="show"
              className="list-item"
            >
              {allItems?.map((x, i) => (
                <motion.li
                  key={x._id}
                  transition={{ duration: 0.8 }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1 },
                  }}
                  style={{ listStyleType: "none" }}
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
            </motion.ul>
          </AnimatePresence>
        </InfiniteScroll>
        <div>
          <DisplayCart />
        </div>
      </div>
    </>
  );
}

export default DisplayItems;

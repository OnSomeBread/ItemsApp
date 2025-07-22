import type { Item } from "../constants";
import { ALL_TYPES, DISPLAY_ITEM_KEYS } from "../constants";
import { useState, useEffect } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import Buttons from "../components/Buttons";
import Loading from "../components/Loading";
import { lazy } from "react";
import DisplayCart from "./DisplayCart";
import { AnimatePresence, motion } from "framer-motion";

const ItemComponentPreview = lazy(
  () => import("../components/ItemComponent.tsx")
);

function DisplayItems() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [search, setSearch] = useState("");
  const [asc, setAsc] = useState("-");
  const [sortBy, setSortBy] = useState("fleaMarket");
  const [type, setType] = useState("any");

  const [hasMore, setHasMore] = useState(false);
  const limit = 50;
  const [offset, setOffset] = useState(limit);

  const BACKEND_ADDRESS: string = import.meta.env.VITE_BACKEND_SERVER as string;
  const params = new URLSearchParams();
  params.append("search", search);
  params.append("asc", asc);
  params.append("sort", sortBy);
  params.append("type", type);
  params.append("limit", limit.toString());
  const q = BACKEND_ADDRESS + "/api?" + params.toString();

  // grabs the first page of items based on the search params
  useEffect(() => {
    axios
      .get<Item[]>(q)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem(item._id) || "0"),
          };
        });
        setAllItems(newItems);
        setHasMore(response.data.length == limit);
      })
      .catch((err) => console.log(err));
  }, [q]);

  // used for the infinite scroll to grab more items
  const getMoreItems = () => {
    axios
      .get<Item[]>(q + "&offset=" + offset)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem(item._id) || "0"),
          };
        });
        setAllItems((prev) => [...(prev ?? []), ...newItems]);
        setHasMore(newItems.length == limit);
        setOffset((prevOffset) => prevOffset + limit);
      })
      .catch((err) => console.log(err));
  };

  // this function is called when the buttons are pressed to change the value of a specific item in local storage
  const changeCount = (idx: number, newNumber: number) => {
    setAllItems(
      allItems?.map((item, index) => {
        if (index === idx) {
          if (newNumber === 0) {
            localStorage.removeItem(item._id);
          } else {
            localStorage.setItem(item._id, newNumber.toString());
          }
          return { ...item, count: newNumber };
        } else {
          return item;
        }
      }) || null
    );
  };

  if (allItems === null) {
    return <Loading />;
  }

  const clearCounts = () => {
    localStorage.clear();
    setAllItems(
      allItems.map((item) => {
        return { ...item, count: 0 };
      })
    );
  };

  const containerVariants = {
    show: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
    },
    show: {
      opacity: 1,
    },
  };

  return (
    <>
      <div className="search-options">
        <input
          className="search-bar"
          onChange={(e) => setSearch(e.target.value)}
        ></input>
        <button
          className="stepper-btn"
          onClick={() => {
            setAsc(asc == "" ? "-" : "");
          }}
        >
          {asc == "" ? "Ascending" : "Descending"}
        </button>
        <select
          className="dropdown"
          defaultValue="fleaMarket"
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Name</option>
          <option value="shortName">Short Name</option>
          <option value="basePrice">Base Price</option>
          <option value="avg24hPrice">Average Price 24 hours</option>
          <option value="changeLast48hPercent">
            Change Last 48 hours Percent
          </option>
          <option value="fleaMarket">Flea Market Price</option>
        </select>
        <select
          className="dropdown"
          defaultValue="any"
          onChange={(e) => setType(e.target.value)}
        >
          {Object.entries(ALL_TYPES).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
        <button className="stepper-btn" onClick={clearCounts}>
          Clear
        </button>
      </div>
      <div className="items-container">
        <InfiniteScroll
          dataLength={allItems.length}
          next={getMoreItems}
          hasMore={hasMore}
          loader={<Loading />}
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>No more items</b>
            </p>
          }
        >
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="list-item"
          >
            <AnimatePresence>
              {allItems.map((x, i) => (
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

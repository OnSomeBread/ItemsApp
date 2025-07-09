import ListItems from "../components/ListItems";
import type { Item } from "../constants";
import { ALLTYPES } from "../constants";
import { useState, useEffect } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";

function DisplayItems() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [search, setSearch] = useState("");
  const [asc, setAsc] = useState("-");
  const [sortBy, setSortBy] = useState("fleaMarket");
  const [type, setType] = useState("any");

  const [hasMore, setHasMore] = useState(true);
  //const [limit, setLimit] = useState(30);
  const limit = 50;
  const [offset, setOffset] = useState(0);

  const q =
    "http://127.0.0.1:8000/api/" +
    "?search=" +
    search +
    "&asc=" +
    asc +
    "&sort=" +
    sortBy +
    "&type=" +
    type;

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
        setHasMore(true);
        setOffset(0);
      })
      .catch((err) => console.log(err));
  }, [q]);

  const getMoreItems = () => {
    const url = q + "&limit=" + limit + "&offset=" + offset;
    axios
      .get<Item[]>(url)
      .then((response) => {
        setAllItems((prev) => [...(prev ?? []), ...response.data]);
        setHasMore(response.data.length > 0);
        setOffset(offset + limit);
      })
      .catch((err) => console.log(err));
  };

  const changeCount = (idx: number, newNumber: number) => {
    setAllItems(
      allItems?.map((item, index) => {
        if (index === idx) {
          localStorage.setItem(item._id, newNumber.toString());
          return { ...item, count: newNumber };
        } else {
          return item;
        }
      }) || null
    );
  };

  // TODO add a more elaborate loading screen
  const loading = () => {
    return <p>loading...</p>;
  };

  if (allItems === null) {
    return loading();
  }

  const clearCounts = () => {
    localStorage.clear();
    setAllItems(
      allItems.map((item) => {
        return { ...item, count: 0 };
      })
    );
  };

  // TODO grab all flea prices, sum them, and display the total
  // const getTotalFleaCost = () => {
  //   let total = 0;
  //   allItems.map((item) => {
  //     if('fleaMarket' in item.sells) {
  //       total += item.sells['fleaMarket']
  //     }
  //   });

  //   return total;
  // }

  return (
    <InfiniteScroll
      dataLength={allItems.length}
      next={getMoreItems}
      hasMore={hasMore}
      loader={loading()}
      endMessage={
        <p style={{ textAlign: "center" }}>
          <b>No more items</b>
        </p>
      }
    >
      <div className="search-options">
        <input
          className="search-bar"
          onChange={(e) => setSearch(e.target.value)}
        ></input>
        <select
          className="dropdown"
          defaultValue="-"
          onChange={(e) => setAsc(e.target.value)}
        >
          <option value="">Ascending</option>
          <option value="-">Decending</option>
        </select>
        <select
          className="dropdown"
          defaultValue="fleaMarket"
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">name</option>
          <option value="shortName">shortName</option>
          <option value="avg24hPrice">Average Price 24 hours</option>
          <option value="basePrice">Base Price</option>
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
          {ALLTYPES.map((t) => (
            <option value={t}>{t}</option>
          ))}
        </select>
        <button className="stepper-btn" onClick={clearCounts}>
          Clear
        </button>
      </div>
      <ListItems items={allItems} onChangeCount={changeCount} />
    </InfiniteScroll>
  );
}

export default DisplayItems;

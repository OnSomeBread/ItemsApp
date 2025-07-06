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
  const limit = 30;
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

  useEffect(() => {
    axios
      .get<Item[]>(q)
      .then((response) => setAllItems(response.data))
      .catch((err) => console.log(err));
  }, [q]);

  //let itemCounts = allItems ? Array(allItems.length).fill(useState(0)) : null;

  // TODO add a more elaborate loading screen
  const loading = () => {
    return <p>loading...</p>;
  };

  if (allItems === null) {
    return loading();
  }

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
      <input onChange={(e) => setSearch(e.target.value)}></input>
      <label>Sort by</label>
      <select defaultValue="-" onChange={(e) => setAsc(e.target.value)}>
        <option value="">Ascending</option>
        <option value="-">Decending</option>
      </select>
      <select
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
      <select defaultValue="any" onChange={(e) => setType(e.target.value)}>
        {ALLTYPES.map((t) => (
          <option value={t}>{t}</option>
        ))}
      </select>
      <ListItems items={allItems} />
    </InfiniteScroll>
  );
}

export default DisplayItems;

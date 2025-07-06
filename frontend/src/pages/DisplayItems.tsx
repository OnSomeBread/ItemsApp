import ListItems from "../components/ListItems";
import type { Item } from "../constants";
import { useState, useEffect } from "react";
import axios from "axios";

function DisplayItems() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [search, setSearch] = useState<string>("");
  const [asc, setAsc] = useState<string>("-");
  const [sortBy, setSortBy] = useState<string>("fleaMarket");
  const [type, setType] = useState<string>("any");

  useEffect(() => {
    axios
      .get<Item[]>(
        "http://127.0.0.1:8000/api/" +
          "?search=" +
          search +
          "&asc=" +
          asc +
          "&sort=" +
          sortBy +
          "&type=" +
          type
      )
      .then((response) => setAllItems(response.data))
      .catch((err) => console.log(err));
  }, [search, asc, sortBy, type]);

  //let itemCounts = allItems ? Array(allItems.length).fill(useState(0)) : null;

  return (
    <>
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
        <option value="any">any</option>
      </select>
      <ListItems items={allItems} />
    </>
  );
}

export default DisplayItems;

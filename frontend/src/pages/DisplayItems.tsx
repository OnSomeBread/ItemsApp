import ItemComponent from "../components/ItemComponent";
import type { Item } from "../constants";
import { ALLTYPES } from "../constants";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import Buttons from "../components/Buttons";
import Loading from "../components/Loading";

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

  const params = new URLSearchParams();
  params.append("search", search);
  params.append("asc", asc);
  params.append("sort", sortBy);
  params.append("type", type);
  const q = "http://127.0.0.1:8000/api/?" + params.toString();

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

  const navigate = useNavigate();
  const location = useLocation();

  // used so that later the DisplayItems.tsx home location can be changed without issue
  const currLocation = location.pathname === "/" ? "" : location.pathname;

  console.log(currLocation);

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

  return (
    <>
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
        <button
          className="stepper-btn"
          onClick={() => navigate(`${currLocation}/cart`)}
        >
          View Cart
        </button>
      </div>
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
        <div className="list_item">
          {allItems.map((x, i) => (
            <ItemComponent item={x} idx={i}>
              <Buttons item={x} idx={i} onChangeCount={changeCount}></Buttons>
            </ItemComponent>
          ))}
        </div>
      </InfiniteScroll>
    </>
  );
}

export default DisplayItems;

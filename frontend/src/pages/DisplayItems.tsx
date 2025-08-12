import { BACKEND_ADDRESS, type Item, type ItemQueryParams } from "../constants";
import { useState, useEffect } from "react";
import axios from "axios";
import { clearPageLocalStorage } from "../utils.ts";
import ItemSearchBarComponent from "../components/ItemSearchBarComponent.tsx";
import ItemScrollComponent from "../components/ItemScrollComponent.tsx";
import ItemCartComponent from "../components/ItemCartComponent.tsx";

function DisplayItems() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const onMobile: boolean = window.matchMedia("(max-width: 767px)").matches;
  // right now its used to switch between 2 interfaces strictly on mobile
  const [interfaceToggle, setInterfaceToggle] = useState<boolean>(false);

  const [queryParams, setQueryParams] = useState<ItemQueryParams>({
    search: "",
    asc: "-",
    sortBy: "fleaMarket",
    type: "any",
    limit: onMobile ? 10 : 50,
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
          if (localStorage.getItem("item-" + item._id) === null) {
            localStorage.setItem(
              "date-added-item-" + item._id,
              Date.now().toString()
            );
          }
          localStorage.setItem("item-" + item._id, newNumber.toString());
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

  return (
    <>
      <ItemSearchBarComponent
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        clearCounts={clearCounts}
      />
      <div className="items-container">
        {onMobile && (
          <input
            type="checkbox"
            role="switch"
            onClick={() => setInterfaceToggle((prev) => !prev)}
          ></input>
        )}
        {(!interfaceToggle || !onMobile) && (
          <ItemScrollComponent
            allItems={allItems}
            getMoreItems={getMoreItems}
            changeCount={changeCount}
            hasMore={hasMore}
            queryParams={queryParams}
          />
        )}
        {(interfaceToggle || !onMobile) && <ItemCartComponent />}
      </div>
    </>
  );
}

export default DisplayItems;

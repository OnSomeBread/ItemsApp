"use client";
import { DEFAULT_ITEM_QUERY_PARAMS } from "../../constants.ts";
import { useState, useEffect } from "react";
import { clearPageLocalStorage } from "../../utils.ts";
import ItemSearchBar from "../../components/ItemSearchBar.tsx";
import ItemScroll from "../../components/ItemScroll.tsx";
import ItemCart from "../../components/ItemCart.tsx";
import api from "../../api.ts";
import type { Item } from "../../types.ts";
import PageSwitch from "../../components/PageSwitch.tsx";

function DisplayItems() {
  const ON_MOBILE: boolean =
    typeof window === "undefined"
      ? false
      : window.matchMedia("(max-width: 767px)").matches;
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // right now its used to switch between 2 interfaces strictly on mobile
  const [interfaceToggle, setInterfaceToggle] = useState<boolean>(false);
  const [queryParams, setQueryParams] = useState(DEFAULT_ITEM_QUERY_PARAMS);
  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    // offset gets skipped for use effect grab since it creates dependency hell and best to add it for scrolling
    if (key === "offset" || value.toString() === "") continue;
    params.append(key, value.toString());
  }
  const query = "/api/items?" + params.toString();

  const fetchItems = (offset: number) => {
    if (typeof window === "undefined") return;
    if (fetchLoading) return;
    setFetchLoading(true);

    api
      .get<Item[]>(query + "&offset=" + offset)
      .then((response) => {
        const newItems = response.data.map((item) => {
          return {
            ...item,
            count: parseInt(localStorage.getItem("item-" + item._id) || "0"),
          };
        });
        // HARD LIMIT ON ITEMS DISPLAYED ON SCREEN AT ANY GIVEN MOMENT
        const addNewItems = allItems === null || allItems.length < 300;
        if (offset === 0) {
          setAllItems(newItems);
        } else {
          if (addNewItems) {
            setAllItems((prev) => [...(prev ?? []), ...newItems]);
          }
        }
        changeQueryParams("offset", offset + queryParams.limit);

        setHasMore(newItems.length === queryParams.limit && addNewItems);
      })
      .catch((err) => console.error(err))
      .finally(() => setFetchLoading(false));
  };

  // grabs the first page of items based on the search params
  useEffect(() => {
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // used for the infinite scroll to grab more items
  const getMoreItems = () => {
    fetchItems(queryParams.offset);
  };

  // this function is called when the buttons are pressed to change the value of a specific item in local storage
  const changeCount = (idx: number, newNumber: number) => {
    if (typeof window === "undefined") return;
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
    if (typeof window === "undefined") return;
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
      <PageSwitch />
      <ItemSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        clearCounts={clearCounts}
      />
      <div className="!grid !w-[100%] !grid-cols-[1fr] !justify-items-center md:!grid-cols-[1fr_300px] md:!justify-items-normal ">
        {ON_MOBILE && (
          <input
            type="checkbox"
            role="switch"
            onClick={() => setInterfaceToggle((prev) => !prev)}
          ></input>
        )}
        {(!interfaceToggle || !ON_MOBILE) && (
          <ItemScroll
            allItems={allItems}
            getMoreItems={getMoreItems}
            changeCount={changeCount}
            hasMore={hasMore}
            queryParams={queryParams}
          />
        )}
        {(interfaceToggle || !ON_MOBILE) && <ItemCart />}
      </div>
    </>
  );
}

export default DisplayItems;

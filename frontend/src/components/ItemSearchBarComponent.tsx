import { useEffect, useState } from "react";
import {
  ALL_ITEM_SORTBY,
  ALL_ITEM_TYPES,
  type ItemQueryParams,
} from "../constants";

interface Props {
  queryParams: ItemQueryParams;
  changeQueryParams: (arg0: string, arg1: string) => void;
  clearCounts: () => void;
}

function ItemSearchBarComponent({
  queryParams,
  changeQueryParams,
  clearCounts,
}: Props) {
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      changeQueryParams("search", searchInput);
    }, 250);

    return () => clearTimeout(delayTimer);
  }, [searchInput, changeQueryParams]);

  return (
    <div className="search-options">
      <input
        className="search-bar"
        onChange={(e) => setSearchInput(e.target.value)}
      ></input>
      <button
        className="stepper-btn"
        onClick={() => {
          changeQueryParams("asc", queryParams.asc == "" ? "-" : "");
        }}
      >
        {queryParams.asc == "" ? "Ascending" : "Descending"}
      </button>
      <select
        className="dropdown"
        defaultValue="fleaMarket"
        onChange={(e) => changeQueryParams("sortBy", e.target.value)}
      >
        {Object.entries(ALL_ITEM_SORTBY).map(([key, value]) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
      <select
        className="dropdown"
        defaultValue="any"
        onChange={(e) => changeQueryParams("type", e.target.value)}
      >
        {Object.entries(ALL_ITEM_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
      <button className="stepper-btn" onClick={clearCounts}>
        Clear
      </button>
    </div>
  );
}

export default ItemSearchBarComponent;

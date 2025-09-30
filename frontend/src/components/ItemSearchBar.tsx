import { useEffect, useRef, useState } from "react";
import { ALL_ITEM_SORTBY, ALL_ITEM_TYPES } from "../constants";
import type { ItemQueryParams } from "../types";

interface Props {
  queryParams: ItemQueryParams;
  changeQueryParams: (arg0: string, arg1: string | number | boolean) => void;
  clearCounts: () => void;
}

function ItemSearchBar({ queryParams, changeQueryParams, clearCounts }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const firstRun = useRef(true);

  useEffect(() => {
    // check if searchInput it being initalized if so skip
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const delayTimer = setTimeout(() => {
      changeQueryParams("search", searchInput);
    }, 250);

    return () => clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const buttonClass =
    "outline contrast flex-1 !border !rounded-[8px] h-13 relative bottom-2 md:bottom-0";
  const dropdownClass = "flex-1 !border !border-[#ccc] !rounded-[8px]";

  return (
    <div className="flex-col gap-4 px-4 pt-4 md:flex md:flex-row">
      <input
        className="flex-1 !border !border-[#ccc]"
        type="search"
        name="search"
        placeholder="search"
        defaultValue={queryParams.search}
        onChange={(e) => setSearchInput(e.target.value)}
      ></input>
      <button
        type="button"
        name="sort_asc"
        className={buttonClass}
        onClick={() => {
          changeQueryParams("sort_asc", !queryParams.sort_asc);
        }}
      >
        {queryParams.sort_asc ? "Ascending" : "Descending"}
      </button>
      <select
        name="sort_by"
        className={dropdownClass}
        defaultValue={queryParams.sort_by}
        onChange={(e) => changeQueryParams("sort_by", e.target.value)}
      >
        {Object.entries(ALL_ITEM_SORTBY).map(([key, value]) => (
          <option key={key} value={key}>
            Sort Data By {value}
          </option>
        ))}
      </select>
      <select
        name="item_type"
        className={dropdownClass}
        defaultValue={queryParams.item_type}
        onChange={(e) => changeQueryParams("item_type", e.target.value)}
      >
        {Object.entries(ALL_ITEM_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            Item Type is {value}
          </option>
        ))}
      </select>
      <button
        type="button"
        name="clearBtn"
        className={buttonClass}
        onClick={clearCounts}
      >
        Clear
      </button>
    </div>
  );
}

export default ItemSearchBar;

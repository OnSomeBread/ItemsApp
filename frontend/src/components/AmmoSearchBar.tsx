import { useEffect, useRef, useState } from "react";
import { ALL_AMMO_SORT_BY, ALL_AMMO_TYPES } from "../constants";
import type { AmmoQueryParams } from "../types";

interface Props {
  queryParams: AmmoQueryParams;
  changeQueryParams: (arg0: string, arg1: string | number | boolean) => void;
}

function AmmoSearchBar({ queryParams, changeQueryParams }: Props) {
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
    }, 200);

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
        {Object.entries(ALL_AMMO_SORT_BY).map(([key, value]) => (
          <option key={key} value={key}>
            Sort Data By {value}
          </option>
        ))}
      </select>
      <select
        name="damage"
        className={dropdownClass}
        defaultValue={queryParams.damage}
        onChange={(e) => changeQueryParams("damage", e.target.value)}
      >
        {[...Array(12).keys()].map((num) => (
          <option key={num * 10} value={num * 10}>
            Damage {">="} {num * 10}
          </option>
        ))}
      </select>
      <select
        name="penetration_power"
        className={dropdownClass}
        defaultValue={queryParams.penetration_power}
        onChange={(e) => changeQueryParams("penetration_power", e.target.value)}
      >
        {[...Array(12).keys()].map((num) => (
          <option key={num * 10} value={num * 10}>
            Penetration Power {">="} {num * 10}
          </option>
        ))}
      </select>
      <select
        name="initial_speed"
        className={dropdownClass}
        defaultValue={queryParams.initial_speed}
        onChange={(e) => changeQueryParams("initial_speed", e.target.value)}
      >
        {[...Array(12).keys()].map((num) => (
          <option key={num * 100} value={num * 100}>
            Intial Speed {">="} {num * 100}
          </option>
        ))}
      </select>
      <select
        name="ammo_type"
        className={dropdownClass}
        defaultValue={queryParams.ammo_type}
        onChange={(e) => changeQueryParams("ammo_type", e.target.value)}
      >
        {Object.entries(ALL_AMMO_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            Ammo Type is {value}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AmmoSearchBar;

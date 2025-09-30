import { useEffect, useRef, useState } from "react";
import { ALL_TASK_OBJECTIVE_TYPES, ALL_TRADERS } from "../constants";
import type { TaskQueryParams } from "../types";

interface Props {
  changeQueryParams: (arg0: string, arg1: string | number | boolean) => void;
  queryParams: TaskQueryParams;
  onClear: () => void;
}

function TaskSearchBar({ changeQueryParams, queryParams, onClear }: Props) {
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
        name="isKappaBtn"
        className={buttonClass}
        onClick={() => {
          changeQueryParams("is_kappa", queryParams.is_kappa ? false : true);
        }}
      >
        {queryParams.is_kappa ? "Kappa Required" : "Not Kappa Required"}
      </button>
      <button
        type="button"
        name="isLightKeeperBtn"
        className={buttonClass}
        onClick={() => {
          changeQueryParams(
            "is_lightkeeper",
            queryParams.is_lightkeeper ? false : true
          );
        }}
      >
        {queryParams.is_lightkeeper
          ? "LightKeeper Required"
          : "Not LightKeeper Required"}
      </button>
      <select
        name="player_lvl"
        className={dropdownClass}
        defaultValue={queryParams.player_lvl}
        onChange={(e) => changeQueryParams("player_lvl", e.target.value)}
      >
        {[...Array(100).keys()].map((num) => (
          <option key={num} value={num}>
            Player Level {num}
          </option>
        ))}
      </select>
      <select
        name="obj_type"
        className={dropdownClass}
        defaultValue={queryParams.obj_type}
        onChange={(e) => changeQueryParams("obj_type", e.target.value)}
      >
        {Object.entries(ALL_TASK_OBJECTIVE_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            Objective Type: {value}
          </option>
        ))}
      </select>
      <select
        name="trader"
        className={dropdownClass}
        defaultValue={queryParams.trader}
        onChange={(e) => changeQueryParams("trader", e.target.value)}
      >
        {Object.entries(ALL_TRADERS).map(([key, value]) => (
          <option key={key} value={key}>
            Trader: {value}
          </option>
        ))}
      </select>
      <button
        type="button"
        name="clearBtn"
        className={buttonClass}
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  );
}

export default TaskSearchBar;

import { useEffect, useState } from "react";
import { ALL_TASK_OBJECTIVE_TYPES, ALL_TRADERS } from "../constants";
import type { TaskQueryParams } from "../types";

interface Props {
  changeQueryParams: (arg0: string, arg1: string | number | boolean) => void;
  queryParams: TaskQueryParams;
  onClear: () => void;
}

function TaskSearchBar({ changeQueryParams, queryParams, onClear }: Props) {
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
        className="search search-bar"
        type="search"
        name="search"
        placeholder="search"
        onChange={(e) => setSearchInput(e.target.value)}
      ></input>
      <button
        className="outline contrast main-btn search-btn"
        onClick={() => {
          changeQueryParams("isKappa", queryParams.isKappa ? false : true);
        }}
      >
        {queryParams.isKappa ? "Kappa Required" : "Not Kappa Required"}
      </button>
      <button
        className="outline contrast main-btn search-btn"
        onClick={() => {
          changeQueryParams(
            "isLightKeeper",
            queryParams.isLightKeeper ? false : true
          );
        }}
      >
        {queryParams.isLightKeeper
          ? "LightKeeper Required"
          : "Not LightKeeper Required"}
      </button>
      <select
        className="dropdown"
        defaultValue={99}
        onChange={(e) => changeQueryParams("playerLvl", e.target.value)}
      >
        {[...Array(100).keys()].map((num) => (
          <option key={num} value={num}>
            Player Level {num}
          </option>
        ))}
      </select>
      <select
        className="dropdown"
        defaultValue="any"
        onChange={(e) => changeQueryParams("objType", e.target.value)}
      >
        {Object.entries(ALL_TASK_OBJECTIVE_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            Objective Type: {value}
          </option>
        ))}
      </select>
      <select
        className="dropdown"
        defaultValue="any"
        onChange={(e) => changeQueryParams("trader", e.target.value)}
      >
        {Object.entries(ALL_TRADERS).map(([key, value]) => (
          <option key={key} value={key}>
            Trader: {value}
          </option>
        ))}
      </select>
      <button
        className="outline contrast main-btn search-btn"
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  );
}

export default TaskSearchBar;

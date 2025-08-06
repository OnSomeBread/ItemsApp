import { useEffect, useState } from "react";
import { ALL_TASK_OBJECTIVE_TYPES, type TaskQueryParams } from "../constants";

interface Props {
  changeQueryParams: (arg0: string, arg1: string | number | boolean) => void;
  queryParams: TaskQueryParams;
  onClear: () => void;
}

function TaskSearchBarComponent({
  changeQueryParams,
  queryParams,
  onClear,
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
          changeQueryParams("isKappa", queryParams.isKappa ? false : true);
        }}
      >
        {queryParams.isKappa ? "Is Kappa Required" : "is Not Kappa Required"}
      </button>
      <button
        className="stepper-btn"
        onClick={() => {
          changeQueryParams(
            "isLightKeeper",
            queryParams.isLightKeeper ? false : true
          );
        }}
      >
        {queryParams.isLightKeeper
          ? "Is LightKeeper Required"
          : "is Not LightKeeper Required"}
      </button>
      <p>Player Level</p>
      <select
        className="dropdown"
        defaultValue={99}
        onChange={(e) => changeQueryParams("playerLvl", e.target.value)}
      >
        {[...Array(100).keys()].map((num) => (
          <option key={num}>{num}</option>
        ))}
      </select>
      <select
        className="dropdown"
        defaultValue="any"
        onChange={(e) => changeQueryParams("objType", e.target.value)}
      >
        {Object.entries(ALL_TASK_OBJECTIVE_TYPES).map(([key, value]) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
      <button className="stepper-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

export default TaskSearchBarComponent;

import axios from "axios";
import { useEffect, useState } from "react";
import { ALL_TASK_OBJECTIVE_TYPES, type Task } from "../constants";
import TaskComponent from "../components/TaskComponent";
import InfiniteScroll from "react-infinite-scroll-component";

type QueryParams = {
  search: string;
  isKappa: boolean;
  isLightKeeper: boolean;
  playerLvl: number;
  objType: string;
  limit: number;
  offset: number;
};

function DisplayTasks() {
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    search: "",
    isKappa: false,
    isLightKeeper: false,
    playerLvl: 99,
    objType: "any",
    limit: 50,
    offset: 50,
  });
  const [hasMore, setHasMore] = useState(false);
  const BACKEND_ADDRESS: string = import.meta.env.VITE_BACKEND_SERVER as string;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (key === "offset") continue;
    params.append(key, value.toString());
  }

  for (const key of Object.keys(localStorage)) {
    const [page, _id] = key.split("-");
    if (page === "task") params.append("ids", _id);
  }

  const query = BACKEND_ADDRESS + "/api/tasks?" + params.toString();

  // grab the inital tasks
  useEffect(() => {
    axios
      .get<Task[]>(query)
      .then((response) => {
        setAllTasks(response.data);
        setHasMore(response.data.length === queryParams.limit);
      })
      .catch((err) => console.log(err));
  }, [query, queryParams.limit]);

  // used for the infinite scroll to grab more tasks
  const getMoreTasks = () => {
    axios
      .get<Task[]>(query + "&offset=" + queryParams.offset)
      .then((response) => {
        setAllTasks((prev) => [...(prev ?? []), ...response.data]);
        setHasMore(response.data.length == queryParams.limit);
        changeQueryParams("offset", queryParams.offset + queryParams.limit);
      })
      .catch((err) => console.log(err));
  };

  const setClear = () => {
    for (const key of Object.keys(localStorage)) {
      const [page, _id] = key.split("-");
      if (page === "task") localStorage.removeItem(page + "-" + _id);
    }
  };

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  // perform dfs starting from start_id
  const onClickComplete = (start_id: string) => {
    axios.get(BACKEND_ADDRESS + "/api/adj_list").then((response) => {
      const adj_list = response.data;

      const visited = new Set();
      const st = [start_id];

      while (st.length > 0) {
        const top_id = st.pop();
        if (top_id === undefined) continue;

        visited.add(top_id);
        localStorage.setItem("task-" + top_id, "Completed");

        // if top_id has no requirements continue
        if (!(top_id in adj_list)) continue;
        for (const req of adj_list[top_id]) {
          if (!visited.has(req[0])) {
            st.push(req[0]);
          }
        }
      }
    });
  };

  return (
    <>
      <div className="search-options">
        <input
          className="search-bar"
          onChange={(e) => changeQueryParams("search", e.target.value)}
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
            <option>{num}</option>
          ))}
        </select>
        <select
          className="dropdown"
          defaultValue="any"
          onChange={(e) => changeQueryParams("objType", e.target.value)}
        >
          {Object.entries(ALL_TASK_OBJECTIVE_TYPES).map(([key, value]) => (
            <option value={key}>{value}</option>
          ))}
        </select>
        <button className="stepper-btn" onClick={setClear}>
          Clear
        </button>
      </div>
      <InfiniteScroll
        dataLength={allTasks?.length ?? 0}
        next={getMoreTasks}
        hasMore={hasMore}
        loader={<></>}
      >
        {allTasks
          ?.filter(
            (task) => localStorage.getItem("task-" + task._id) !== "Completed"
          )
          .map((task) => (
            <TaskComponent
              key={task._id}
              task={task}
              onClick={onClickComplete}
            />
          ))}
      </InfiniteScroll>
    </>
  );
}

export default DisplayTasks;

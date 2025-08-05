import axios from "axios";
import { useEffect, useState } from "react";
import { BACKEND_ADDRESS, type Task, type TaskQueryParams } from "../constants";
import TaskComponent from "../components/TaskComponent";
import InfiniteScroll from "react-infinite-scroll-component";
import TaskSearchBarComponent from "../components/TaskSearchBarComponent";
import { motion } from "framer-motion";
import { clearPageLocalStorage } from "../utils";

function DisplayTasks() {
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [queryParams, setQueryParams] = useState<TaskQueryParams>({
    search: "",
    isKappa: false,
    isLightKeeper: false,
    playerLvl: 99,
    objType: "any",
    limit: 50,
    offset: 50,
  });
  const [hasMore, setHasMore] = useState(false);

  // the actual value here doesn't matter its for the useEffect so that it can account for changed task list
  const [changedTasksToggle, setChangedTasksToggle] = useState(false);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (key === "offset") continue;
    params.append(key, value.toString());
  }

  // grab all of the tasks that were marked completed
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("task")) params.append("ids", key.slice("task-".length));
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
  }, [query, queryParams.limit, changedTasksToggle]);

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

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  // perform dfs starting from start_id
  const onClickComplete = (start_id: string) => {
    axios
      .get(BACKEND_ADDRESS + "/api/adj_list")
      .then((response) => {
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
        setChangedTasksToggle((prev) => !prev);
      })
      .catch((err) => console.log(err));
  };

  return (
    <>
      <TaskSearchBarComponent
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        onClear={() => {
          setChangedTasksToggle((prev) => !prev);
          clearPageLocalStorage("task");
        }}
      />
      <InfiniteScroll
        dataLength={allTasks?.length ?? 0}
        next={getMoreTasks}
        hasMore={hasMore}
        loader={<></>}
      >
        <motion.ul>
          {allTasks?.map((task) => (
            <motion.li
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <TaskComponent
                key={task._id}
                task={task}
                onClick={onClickComplete}
              />
            </motion.li>
          ))}
        </motion.ul>
      </InfiniteScroll>
    </>
  );
}

export default DisplayTasks;

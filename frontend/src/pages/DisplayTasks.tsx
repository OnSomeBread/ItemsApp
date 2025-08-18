import { useEffect, useState } from "react";
import { type Task, type TaskQueryParams } from "../constants";
import TaskComponent from "../components/TaskComponent";
import InfiniteScroll from "react-infinite-scroll-component";
import TaskSearchBar from "../components/TaskSearchBar";
import { motion } from "framer-motion";
import { clearPageLocalStorage } from "../utils";
import api from "../api";

function DisplayTasks() {
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Task[] | null>(null);
  const [queryParams, setQueryParams] = useState<TaskQueryParams>({
    search: "",
    isKappa: false,
    isLightKeeper: false,
    playerLvl: 99,
    objType: "any",
    trader: "any",
    limit: 50,
    offset: 0,
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

  const query = "/api/tasks?" + params.toString();

  const fetchTasks = (offset: number) => {
    api
      .get<Task[]>(query + "&offset=" + offset)
      .then((response) => {
        if (offset == 0) {
          setAllTasks(response.data);
        } else {
          setAllTasks((prev) => [...(prev ?? []), ...response.data]);
        }

        setHasMore(response.data.length == queryParams.limit);
        changeQueryParams("offset", offset + queryParams.limit);
      })
      .catch((err) => console.log(err));
  };

  // grab the inital tasks
  useEffect(() => {
    fetchTasks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, queryParams.limit, changedTasksToggle]);

  // used for the infinite scroll to grab more tasks
  const getMoreTasks = () => {
    fetchTasks(queryParams.offset);
  };

  useEffect(() => {
    if (params.getAll("ids").length === 0) {
      setCompletedTasks(null);
      return;
    }
    api
      .get("/api/task_ids?ids=" + params.getAll("ids").join("&ids="))
      .then((response) => {
        setCompletedTasks(response.data);
      })
      .catch((err) => console.log(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedTasksToggle]);

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  // perform dfs starting from start_id
  const onClickComplete = (start_id: string, relation: string) => {
    api
      .get("/api/adj_list")
      .then((response) => {
        const adj_list = response.data;

        const visited = new Set();
        const st = [start_id];

        while (st.length > 0) {
          const top_id = st.pop();
          if (top_id === undefined) continue;

          visited.add(top_id);
          if (relation === "requirement") {
            localStorage.setItem("task-" + top_id, "Completed");
          } else if (relation === "predecessor") {
            localStorage.removeItem("task-" + top_id);
          }

          // if top_id has no requirements continue
          if (!(top_id in adj_list)) continue;
          for (const req of adj_list[top_id]) {
            if (!visited.has(req[0]) && req[1] == relation) {
              st.push(req[0]);
            }
          }
        }
        setChangedTasksToggle((prev) => !prev);
      })
      .catch((err) => console.log(err));
  };

  const containerVarients = {
    show: {
      transition: {
        staggerChildren:
          // first load has a stagger animation but when infinite scrolling its turned off
          allTasks && allTasks.length > queryParams.limit ? 0 : 0.04,
      },
    },
  };

  return (
    <>
      <TaskSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        onClear={() => {
          setChangedTasksToggle((prev) => !prev);
          clearPageLocalStorage("task");
        }}
      />
      <div style={{ width: "100%", display: "flex" }}>
        <div style={{ flex: 1 }}>
          <InfiniteScroll
            dataLength={allTasks?.length ?? 0}
            next={getMoreTasks}
            hasMore={hasMore}
            loader={<article aria-busy="true"></article>}
          >
            <motion.ul
              key={allTasks?.length}
              variants={containerVarients}
              initial="hidden"
              animate="show"
            >
              {allTasks?.map((task) => (
                <motion.li
                  key={task._id}
                  transition={{ duration: 0.8 }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1 },
                  }}
                >
                  <TaskComponent task={task} onClickButton={onClickComplete} />
                </motion.li>
              ))}
            </motion.ul>
          </InfiniteScroll>
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          {completedTasks && (
            <div>
              <p>All Completed Tasks</p>
              <p>(click on a task to set not completed)</p>
            </div>
          )}
          <motion.ul
            key={completedTasks?.length}
            variants={containerVarients}
            initial="hidden"
            animate="show"
          >
            {completedTasks?.map((task) => (
              <motion.li
                key={task._id}
                transition={{ duration: 0.8 }}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1 },
                }}
                onClick={() => {
                  onClickComplete(task._id, "predecessor");
                }}
              >
                {task.name}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </>
  );
}

export default DisplayTasks;

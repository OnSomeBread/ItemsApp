import { useEffect, useState } from "react";
import api from "../api";
import { ALL_TRADERS } from "../constants";
import type { Task, TaskAdjList } from "../types";
import TaskTreeComponent from "../components/TaskTreeComponent";
import PageSwitch from "../components/PageSwitch";
import { type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function TaskTree() {
  const [adjList, setAdjList] = useState<TaskAdjList | null>(null);
  // this forces adjList useEffect to only run once
  const [getAdjList] = useState(false);

  useEffect(() => {
    const session_adj_list = sessionStorage.getItem("tasks-adj_list");
    if (session_adj_list !== null) {
      setAdjList(JSON.parse(session_adj_list));
      return;
    }

    api
      .get("/api/adj_list")
      .then((response) => {
        setAdjList(response.data);
        sessionStorage.setItem("tasks-adj_list", JSON.stringify(response.data));
      })
      .catch((err) => console.log(err));
  }, [getAdjList]);

  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [queryParams, setQueryParams] = useState({
    trader: "Prapor",
    limit: 500,
  });

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) =>
    params.append(key, value.toString())
  );

  // grab all of the tasks that were marked completed
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("task")) params.append("ids", key.slice("task-".length));
  }

  const query = "/api/tasks?" + params.toString();

  // grab the inital tasks
  useEffect(() => {
    api
      .get<Task[]>(query)
      .then((response) => {
        setAllTasks(response.data);
      })
      .catch((err) => console.log(err));
  }, [query]);

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.name },
    })) ?? [];

  const idToTask = new Map<string, Task>(
    allTasks?.map((task) => [task._id, task]) ?? []
  );

  const initEdges: Edge[] = [];
  if (adjList) {
    initNodes.forEach((node) => {
      const connections = adjList[node.id]?.filter(
        (dir) => dir[1] === "unlocks" && idToTask.has(dir[0])
      );
      connections?.forEach((val) =>
        initEdges.push({
          id: node.id + val[0],
          source: node.id,
          target: val[0],
          style: { strokeWidth: 2 },
        })
      );
    });
  }

  if (!adjList || !allTasks) return <article aria-busy="true"></article>;

  return (
    // the div styling is to make the subdivs display over eachother
    <div style={{ position: "relative" }}>
      <div style={{ zIndex: 2, position: "absolute" }}>
        <PageSwitch />
        <select
          onChange={(e) => changeQueryParams("trader", e.target.value)}
          style={{
            margin: "auto",
            width: "300px",
            marginTop: 6,
            marginLeft: 16,
          }}
        >
          {Object.entries(ALL_TRADERS)
            .filter((trader) => trader[0] !== "any")
            .map(([key, value]) => (
              <option key={key} value={key}>
                Trader: {value}
              </option>
            ))}
        </select>
      </div>
      <div style={{ zIndex: 1, position: "absolute" }}>
        <TaskTreeComponent
          adjList={adjList}
          allTasks={allTasks}
          initNodes={initNodes}
          initEdges={initEdges}
          idToTask={idToTask}
        />
      </div>
    </div>
  );
}

export default TaskTree;

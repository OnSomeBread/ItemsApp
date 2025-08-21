import { useEffect, useState } from "react";
import api from "../api";
import { type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { ALL_TRADERS } from "../constants";
import type { Task } from "../types";
import TaskTreeComponent from "../components/TaskTreeComponent";
import PageSwitch from "../components/PageSwitch";

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
type TaskAdjList = {
  [key: string]: [string, string][];
};

function TaskTree() {
  const [adjList, setAdjList] = useState<TaskAdjList | null>(null);
  // this forces adjList useEffect to only run once
  const [getAdjList] = useState(false);

  useEffect(() => {
    api
      .get("/api/adj_list")
      .then((response) => {
        setAdjList(response.data);
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
        })
      );
    });
  }

  if (!adjList || !allTasks) return <article aria-busy="true"></article>;

  return (
    <div>
      <PageSwitch />
      <select
        onChange={(e) => changeQueryParams("trader", e.target.value)}
        style={{ margin: "auto", width: "300px" }}
      >
        {Object.entries(ALL_TRADERS)
          .filter((trader) => trader[0] !== "any")
          .map(([key, value]) => (
            <option key={key} value={key}>
              Trader: {value}
            </option>
          ))}
      </select>
      <TaskTreeComponent
        adjList={adjList}
        allTasks={allTasks}
        initNodes={initNodes}
        initEdges={initEdges}
        idToTask={idToTask}
      />
    </div>
  );
}

export default TaskTree;

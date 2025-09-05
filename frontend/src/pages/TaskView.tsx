import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";
import type { Task, TaskAdjList } from "../types";
import PageSwitch from "../components/PageSwitch";
import { ALL_TASK_OBJECTIVE_TYPES } from "../constants";

function TaskView() {
  const location = useLocation();
  const task = location.state as Task;
  const [adjTasks, setAdjTasks] = useState<Task[] | null>(null);

  // maps task id to status for all adjTasks
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map());
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
        const adj_list = response.data;
        setAdjList(adj_list);

        sessionStorage.setItem("tasks-adj_list", JSON.stringify(adj_list));
      })
      .catch((err) => console.log(err));
  }, [getAdjList]);

  useEffect(() => {
    if (adjList === null) return;
    const params = new URLSearchParams();
    const statMap = new Map();

    task.taskRequirements.forEach((tsk) => {
      params.append("ids", tsk.reqTaskId);
      statMap.set(tsk.reqTaskId, tsk.status);
    });

    adjList[task._id]
      .filter((tsk) => tsk[1] === "unlocks")
      .forEach((tsk) => {
        params.append("ids", tsk[0]);
        statMap.set(tsk[0], tsk[1]);
      });

    setStatusMap(statMap);

    api
      .get<Task[]>("/api/task_ids?" + params.toString())
      .then((response) => setAdjTasks(response.data))
      .catch((err) => console.log(err));
  }, [adjList, task._id, task.taskRequirements]);

  if (!task) return <p>no task passed in</p>;

  const taskPreqs = adjTasks?.filter(
    (tst) => statusMap.get(tst._id) !== "unlocks"
  );

  const taskUnlocks = adjTasks?.filter(
    (tst) => statusMap.get(tst._id) === "unlocks"
  );

  return (
    <>
      <PageSwitch />
      <div style={{ display: "flex" }}>
        <div style={{ padding: 20, flex: 1 }}>
          <p>{task.name}</p>
          <p>Minimum player Level: {task.minPlayerLevel}</p>
          <p>Task Giver: {task.trader}</p>
          <p>Faction Name: {task.factionName}</p>
          <p>Kappa Required: {task.kappaRequired ? "Yes" : "No"}</p>
          <p>Lightkeeper Required: {task.kappaRequired ? "Yes" : "No"}</p>
          <p>
            <a href={task.wiki}>wiki page</a>
          </p>
          <p>Objectives</p>
          <ul>
            {task.objectives.map((obj) => (
              <li key={obj._id}>
                <p>
                  Objective Type:{" "}
                  {
                    ALL_TASK_OBJECTIVE_TYPES[
                      obj.objType as keyof typeof ALL_TASK_OBJECTIVE_TYPES
                    ]
                  }
                </p>
                <p>{obj.description}</p>
                {obj.maps.length > 0 && (
                  <p>
                    {obj.maps.length > 1 ? "Maps" : "Map"}:{" "}
                    {obj.maps.map((m) => m.name).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ padding: 20, flex: 1 }}>
          {taskPreqs && taskPreqs.length > 0 && (
            <>
              <p>Task Requirements</p>
              <ul>
                {taskPreqs.map((taskReq) => (
                  <li key={taskReq._id}>
                    <Link to="/task_view" state={taskReq}>
                      {statusMap.get(taskReq._id)}: {taskReq.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {taskUnlocks && taskUnlocks.length > 0 && (
            <>
              <p>Task Unlocks</p>
              <ul>
                {taskUnlocks.map((taskReq) => (
                  <li key={taskReq._id}>
                    <Link to="/task_view" state={taskReq}>
                      {statusMap.get(taskReq._id)}: {taskReq.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default TaskView;

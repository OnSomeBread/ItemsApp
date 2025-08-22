import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";
import type { Task } from "../types";
import PageSwitch from "../components/PageSwitch";
import { ALL_TASK_OBJECTIVE_TYPES } from "../constants";

function TaskView() {
  const location = useLocation();
  const task = location.state as Task;

  const [taskReqs, setTaskReqs] = useState<Task[] | null>(null);
  const params = new URLSearchParams();
  const statusMap = new Map();
  task.taskRequirements.forEach((taskReq) => {
    params.append("ids", taskReq.reqTaskId);
    statusMap.set(taskReq.reqTaskId, taskReq.status);
  });

  const query = "/api/task_ids?" + params.toString();
  useEffect(() => {
    api
      .get<Task[]>(query)
      .then((response) => {
        setTaskReqs(response.data);
      })
      .catch((err) => console.log(err));
  }, [query]);
  const navigate = useNavigate();

  if (!task) return <p>no task passed in</p>;

  return (
    <>
      <PageSwitch />
      <div style={{ padding: 20 }}>
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

        {taskReqs && taskReqs.length > 0 && (
          <>
            <p>Task Requirements</p>
            <ul>
              {taskReqs?.map((taskReq) => (
                <li key={taskReq._id}>
                  <a onClick={() => navigate("/task_view", { state: taskReq })}>
                    {statusMap.get(taskReq._id)}: {taskReq.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export default TaskView;

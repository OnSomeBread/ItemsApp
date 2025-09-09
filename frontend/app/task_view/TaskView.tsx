import Link from "next/link";
import type { Task, TaskAdjList } from "../../utils/types";
import PageSwitch from "../../components/PageSwitch";
import {
  ALL_TASK_OBJECTIVE_TYPES,
  DOCKER_BACKEND,
} from "../../utils/constants";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

async function TaskView({ searchParams }: PageProps) {
  const { id } = (await searchParams) ?? { id: undefined };
  if (id === undefined) return <p>no task passed in</p>;

  const res1 = await fetch(DOCKER_BACKEND + "/api/task_ids?ids=" + id, {
    cache: "no-store",
  });
  const task: Task = (await res1.json())[0];

  const res2 = await fetch(DOCKER_BACKEND + "/api/adj_list", {
    cache: "no-store",
  });
  const adjList: TaskAdjList = await res2.json();

  // maps task id to status for all adjTasks
  const statusMap = new Map<string, string>();
  const params = new URLSearchParams();
  task.taskRequirements.forEach((tsk) => {
    params.append("ids", tsk.reqTaskId);
    statusMap.set(tsk.reqTaskId, tsk.status);
  });

  adjList[task._id]
    .filter((tsk) => tsk[1] === "unlocks")
    .forEach((tsk) => {
      params.append("ids", tsk[0]);
      statusMap.set(tsk[0], tsk[1]);
    });

  const res3 = await fetch(
    DOCKER_BACKEND + "/api/task_ids?" + params.toString(),
    {
      cache: "no-store",
    }
  );
  const adjTasks: Task[] = await res3.json();

  const taskPreqs = adjTasks?.filter(
    (tst) => statusMap.get(tst._id) !== "unlocks"
  );

  const taskUnlocks = adjTasks?.filter(
    (tst) => statusMap.get(tst._id) === "unlocks"
  );

  return (
    <>
      <PageSwitch />
      <div className="flex">
        <div className="p-12 flex-1">
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
        <div className="p-20 flex-1">
          {taskPreqs && taskPreqs.length > 0 && (
            <>
              <p>Task Requirements</p>
              <ul>
                {taskPreqs.map((taskReq) => (
                  <li key={taskReq._id}>
                    <Link
                      href={{
                        pathname: "/task_view",
                        query: "id=" + taskReq._id,
                      }}
                    >
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
                    <Link
                      href={{
                        pathname: "/task_view",
                        query: "id=" + taskReq._id,
                      }}
                    >
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

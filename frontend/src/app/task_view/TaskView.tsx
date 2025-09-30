import Link from "next/link";
import type { Task, TaskAdjList } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import { ALL_TASK_OBJECTIVE_TYPES, DOCKER_BACKEND } from "../../constants";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

async function TaskView({ searchParams }: PageProps) {
  const id = (await searchParams)?.id;
  if (id === undefined) return <p>no task passed in</p>;

  const res1 = await fetch(DOCKER_BACKEND + "/api/tasks/ids?ids=" + id, {
    cache: "no-store",
  });

  const task = ((await res1.json()) as Task[])[0];

  const res2 = await fetch(DOCKER_BACKEND + "/api/tasks/adj_list", {
    cache: "no-store",
  });
  const adjList = (await res2.json()) as TaskAdjList;

  // maps task id to status for all adjTasks
  const statusMap = new Map<string, string>();
  const params = new URLSearchParams();
  task.task_requirements.forEach((tsk) => {
    params.append("ids", tsk.req_task_id);
    statusMap.set(tsk.req_task_id, tsk.status);
  });

  adjList[task._id]
    .filter((tsk) => tsk[1] === true)
    .forEach((tsk) => {
      params.append("ids", tsk[0]);
      statusMap.set(tsk[0], tsk[1] ? "unlocks" : "prerequisite");
    });

  const res3 = await fetch(
    DOCKER_BACKEND + "/api/tasks/ids?" + params.toString(),
    {
      cache: "no-store",
    }
  );
  const adjTasks = (await res3.json()) as Task[];

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
        <div className="flex-1 p-12">
          <p>{task.task_name}</p>
          <p>Minimum player Level: {task.min_player_level}</p>
          <p>Task Giver: {task.trader}</p>
          <p>Faction Name: {task.faction_name}</p>
          <p>Kappa Required: {task.kappa_required ? "Yes" : "No"}</p>
          <p>Lightkeeper Required: {task.kappa_required ? "Yes" : "No"}</p>
          <p>
            <a href={task.wiki}>wiki page</a>
          </p>
          <p>Objectives</p>
          <ul>
            {task.objectives.map((obj, i) => (
              // the array here is constant so this lint can be ignored
              // eslint-disable-next-line @eslint-react/no-array-index-key
              <li key={i}>
                <p>
                  Objective Type:{" "}
                  {
                    ALL_TASK_OBJECTIVE_TYPES[
                      obj.obj_type as keyof typeof ALL_TASK_OBJECTIVE_TYPES
                    ]
                  }
                </p>
                <p>{obj.obj_description}</p>
                <p>{obj.map_name}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 p-20">
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
                      {statusMap.get(taskReq._id)}: {taskReq.task_name}
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
                      {statusMap.get(taskReq._id)}: {taskReq.task_name}
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

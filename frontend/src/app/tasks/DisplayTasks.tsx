import PageSwitch from "../../components/PageSwitch";
import TaskScroll from "../../components/TaskScroll";
import { DEFAULT_TASK_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import type { Task, TaskBase, TaskQueryParams, TaskStats } from "../../types";
import { cookies } from "next/headers";

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

async function DisplayTasks({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  const res1 = await fetch(DOCKER_BACKEND + "/tasks/stats", {
    cache: "no-store",
    headers,
  });
  const taskStats = (await res1.json()) as TaskStats;

  const res2 = await fetch(DOCKER_BACKEND + "/tasks/query_parms", {
    cache: "no-store",
    headers,
  });
  const resQueryParams = (await res2.json()) as TaskQueryParams;

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_TASK_QUERY_PARAMS,
    ...resQueryParams,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res3 = await fetch(DOCKER_BACKEND + "/tasks?" + params.toString(), {
    cache: "no-store",
    headers,
  });
  const tasks = (await res3.json()) as Task[];
  queryParams.offset = queryParams.limit;

  const res4 = await fetch(DOCKER_BACKEND + "/tasks/get_completed", {
    cache: "no-store",
    headers,
  });
  const completedTasks = (await res4.json()) as TaskBase[];

  return (
    <>
      <PageSwitch />
      <TaskScroll
        initTasks={tasks}
        completedTasks={completedTasks}
        initQueryParams={queryParams}
        headers={headers}
        initTaskStats={taskStats}
      />
    </>
  );
}

export default DisplayTasks;

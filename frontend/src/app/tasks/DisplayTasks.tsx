import PageSwitch from "../../components/PageSwitch";
import TaskScroll from "../../components/TaskScroll";
import { DEVICE_UUID_COOKIE_NAME } from "../../proxy";
import type { Task, TaskBase, TaskQueryParams, TaskStats } from "../../types";
import { cookies } from "next/headers";
import { apiFetch } from "../../utils";
import { DEFAULT_TASK_QUERY_PARAMS } from "../../constants";

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

  // fetch stats, query params, and completed tasks in parallel (they are relatively static)
  const [res1, res2, res4] = await Promise.all([
    apiFetch("/tasks/stats", {
      cache: "no-store",
      headers,
    }),
    apiFetch("/tasks/query_parms", {
      cache: "no-store",
      headers,
    }),
    apiFetch("/tasks/get_completed", {
      cache: "no-store",
      headers,
    }),
  ]);

  const [taskStats, resQueryParams, completedTasks] = await Promise.all([
    res1.json() as Promise<TaskStats>,
    res2.json() as Promise<TaskQueryParams>,
    res4.json() as Promise<TaskBase[]>,
  ]);

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_TASK_QUERY_PARAMS,
    ...resQueryParams,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res3 = await apiFetch("/tasks?" + params.toString(), {
    cache: "no-store",
    headers,
  });
  const tasks = (await res3.json()) as Task[];
  queryParams.offset = queryParams.limit;

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

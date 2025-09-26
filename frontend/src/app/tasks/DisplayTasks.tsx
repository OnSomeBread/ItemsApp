import PageSwitch from "../../components/PageSwitch";
import TaskScroll from "../../components/TaskScroll";
import { DEFAULT_TASK_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import type { Task, TaskQueryParams } from "../../types";
import { cookies } from "next/headers";

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

async function DisplayTasks({ searchParams }: PageProps) {
  const queryParams =
    (await searchParams)?.queryParams ?? DEFAULT_TASK_QUERY_PARAMS;

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  const res2 = await fetch(DOCKER_BACKEND + "/api/tasks?" + params.toString(), {
    cache: "no-store",
    headers,
  });
  const tasks = (await res2.json()) as Task[];

  const res3 = await fetch(DOCKER_BACKEND + "/api/get_completed", {
    cache: "no-store",
    headers,
  });
  const completedTasks = (await res3.json()) as Task[];

  return (
    <>
      <PageSwitch />
      <TaskScroll
        initTasks={tasks}
        completedTasks={completedTasks}
        initQueryParams={queryParams}
        headers={headers}
      />
    </>
  );
}

export default DisplayTasks;

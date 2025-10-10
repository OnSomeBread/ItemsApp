import NeededItemScroll from "../../components/NeededItemScroll";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_TASK_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import type { ItemBase, TaskQueryParams, TaskStats } from "../../types";
import { cookies } from "next/headers";

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

async function DisplayNeededItems({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  const res1 = await fetch(DOCKER_BACKEND + "/api/tasks/stats", {
    cache: "no-store",
    headers,
  });
  const taskStats = (await res1.json()) as TaskStats;

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_TASK_QUERY_PARAMS,
    limit: 1000,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res2 = await fetch(
    DOCKER_BACKEND + "/api/tasks/get_required_items?" + params.toString(),
    {
      cache: "no-store",
      headers,
    }
  );
  const items = (await res2.json()) as [ItemBase, number][];

  return (
    <>
      <PageSwitch />
      <NeededItemScroll
        initItems={items}
        initQueryParams={queryParams}
        headers={headers}
        initTaskStats={taskStats}
      />
    </>
  );
}

export default DisplayNeededItems;

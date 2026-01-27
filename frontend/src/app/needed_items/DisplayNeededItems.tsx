import NeededItemScroll from "../../components/NeededItemScroll";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_TASK_QUERY_PARAMS } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../proxy";
import type { ItemBase, TaskQueryParams, TaskStats } from "../../types";
import { cookies } from "next/headers";
import { apiFetch } from "../../utils";

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

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_TASK_QUERY_PARAMS,
    is_kappa: true,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  // Fetch task stats and required items in parallel
  const [res1, res2] = await Promise.all([
    apiFetch("/tasks/stats", {
      cache: "no-store",
      headers,
    }),
    apiFetch("/tasks/get_required_items?" + params.toString(), {
      cache: "no-store",
      headers,
    }),
  ]);

  const [taskStats, items] = await Promise.all([
    res1.json() as Promise<TaskStats>,
    res2.json() as Promise<[ItemBase, number][]>,
  ]);

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

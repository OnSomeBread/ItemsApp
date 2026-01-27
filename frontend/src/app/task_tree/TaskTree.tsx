import type { TaskAdjList, TaskBase } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import { type Edge } from "@xyflow/react";
import TraderSelect from "../../components/TraderSelect";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import { apiFetch } from "../../utils";

const TaskTreeComponent = dynamic(
  () => import("../../components/TaskTreeComponent")
);

type PageProps = {
  searchParams: Promise<{
    trader?: string;
    is_kappa?: boolean;
    is_lightkeeper?: boolean;
    include_completed?: boolean;
  }>;
};

async function TaskTree({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  let { trader, is_kappa, is_lightkeeper, include_completed } =
    (await searchParams) ?? {
      trader: "Prapor",
      is_kappa: false,
      is_lightkeeper: false,
      include_completed: true,
    };
  if (trader === undefined) trader = "Prapor";
  if (is_kappa === undefined) is_kappa = false;
  if (is_lightkeeper === undefined) is_lightkeeper = false;
  if (include_completed === undefined) include_completed = true;

  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  // build query params using URLSearchParams
  const queryParams = new URLSearchParams({
    trader,
    is_kappa: is_kappa.toString(),
    is_lightkeeper: is_lightkeeper.toString(),
    include_completed: include_completed.toString(),
    limit: "1000",
    save: "false",
  });

  // Fetch adjacency list and tasks in parallel
  const [res1, res2] = await Promise.all([
    apiFetch("/tasks/adj_list", {
      cache: "no-store",
    }),
    apiFetch("/tasks/base?" + queryParams.toString(), {
      cache: "no-store",
      headers,
    }),
  ]);

  const [adjList, allTasks] = await Promise.all([
    res1.json() as Promise<TaskAdjList>,
    res2.json() as Promise<TaskBase[]>,
  ]);

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.task_name },
    })) ?? [];

  const idToTaskSet = new Set(allTasks?.map((task) => task._id) ?? []);

  const initEdges: Edge[] = [];
  if (adjList) {
    initNodes.forEach((node) => {
      const connections = adjList[node.id];
      if (connections) {
        connections.forEach(([targetId, isActive]) => {
          if (isActive && idToTaskSet.has(targetId)) {
            initEdges.push({
              id: node.id + targetId,
              source: node.id,
              target: targetId,
              style: { strokeWidth: 2 },
            });
          }
        });
      }
    });
  }

  return (
    // the div styling is to make the subdivs display over eachother
    <div className="relative">
      <div className="absolute z-2">
        <PageSwitch />
        <TraderSelect
          trader={trader}
          isKappa={is_kappa}
          isLightkeeper={is_lightkeeper}
          includeCompleted={include_completed}
        />
      </div>
      <div className="absolute z-1">
        <div className="h-[100vh] w-[100vw]">
          <TaskTreeComponent
            adjList={adjList}
            allTasks={allTasks}
            initNodes={initNodes}
            initEdges={initEdges}
          />
        </div>
      </div>
    </div>
  );
}

export default TaskTree;

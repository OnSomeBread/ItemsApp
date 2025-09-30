import type { TaskAdjList, TaskBase } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import { type Edge } from "@xyflow/react";
import TraderSelect from "../../components/TraderSelect";
import { DOCKER_BACKEND } from "../../constants";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";

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

  const res1 = await fetch(DOCKER_BACKEND + "/api/tasks/adj_list", {
    cache: "no-store",
  });
  const adjList = (await res1.json()) as TaskAdjList;

  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  const res2 = await fetch(
    DOCKER_BACKEND +
      "/api/tasks/base?trader=" +
      trader +
      "&is_kappa=" +
      is_kappa +
      "&is_lightkeeper=" +
      is_lightkeeper +
      "&include_completed=" +
      include_completed +
      "&limit=1000&save=false",
    {
      cache: "no-store",
      headers,
    }
  );
  const allTasks = (await res2.json()) as TaskBase[];

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.task_name },
    })) ?? [];

  const idToTask = new Map<string, TaskBase>(
    allTasks?.map((task) => [task._id, task]) ?? []
  );

  const initEdges: Edge[] = [];
  if (adjList) {
    initNodes.forEach((node) => {
      const connections = adjList[node.id]?.filter(
        (dir) => dir[1] === true && idToTask.has(dir[0])
      );
      connections?.forEach((val) =>
        initEdges.push({
          id: node.id + val[0],
          source: node.id,
          target: val[0],
          style: { strokeWidth: 2 },
        })
      );
    });
  }

  if (!adjList || !allTasks) return <article aria-busy="true" />;

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

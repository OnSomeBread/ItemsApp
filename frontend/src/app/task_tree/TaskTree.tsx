import type { Task, TaskAdjList } from "../../types";
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
    isKappa?: boolean;
    isLightkeeper?: boolean;
    includeCompleted?: boolean;
  }>;
};

async function TaskTree({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  let { trader, isKappa, isLightkeeper, includeCompleted } =
    (await searchParams) ?? {
      trader: "Prapor",
      isKappa: false,
      isLightkeeper: false,
      includeCompleted: true,
    };
  if (trader === undefined) trader = "Prapor";
  if (isKappa === undefined) isKappa = false;
  if (isLightkeeper === undefined) isLightkeeper = false;
  if (includeCompleted === undefined) includeCompleted = true;

  const res1 = await fetch(DOCKER_BACKEND + "/api/adj_list", {
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
      "/api/tasks?trader=" +
      trader +
      "&isKappa=" +
      isKappa +
      "&isLightkeeper=" +
      isLightkeeper +
      "&includeCompleted=" +
      includeCompleted +
      "&limit=1000&save=false",
    {
      cache: "no-store",
      headers,
    }
  );
  const allTasks = (await res2.json()) as Task[];

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.task_name },
    })) ?? [];

  const idToTask = new Map<string, Task>(
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
          isKappa={isKappa}
          isLightkeeper={isLightkeeper}
          includeCompleted={includeCompleted}
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

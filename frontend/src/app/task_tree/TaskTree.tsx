import type { Task, TaskAdjList } from "../../types";
import TaskTreeComponent from "../../components/TaskTreeComponent";
import PageSwitch from "../../components/PageSwitch";
import { type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TraderSelect from "../../components/TraderSelect";
import { Suspense } from "react";
import { DOCKER_BACKEND } from "../../constants";

type PageProps = {
  searchParams: Promise<{ trader?: string }>;
};

async function TaskTree({ searchParams }: PageProps) {
  let { trader } = (await searchParams) ?? { trader: "Prapor" };
  if (trader === undefined) {
    trader = "Prapor";
  }

  const res1 = await fetch(DOCKER_BACKEND + "/api/adj_list", {
    cache: "no-store",
  });
  const adjList = (await res1.json()) as TaskAdjList;

  // TODO grab all of the tasks that were marked completed
  // for (const key of Object.keys(localStorage)) {
  //   if (key.startsWith("task")) params.append("ids", key.slice("task-".length));
  // }

  const res2 = await fetch(
    DOCKER_BACKEND + "/api/tasks?trader=" + trader + "&limit=500",
    {
      cache: "no-store",
    }
  );
  const allTasks = (await res2.json()) as Task[];

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.name },
    })) ?? [];

  const idToTask = new Map<string, Task>(
    allTasks?.map((task) => [task._id, task]) ?? []
  );

  const initEdges: Edge[] = [];
  if (adjList) {
    initNodes.forEach((node) => {
      const connections = adjList[node.id]?.filter(
        (dir) => dir[1] === "unlocks" && idToTask.has(dir[0])
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
      <div className="z-2 absolute">
        <PageSwitch />
        <TraderSelect trader={trader} />
      </div>
      <div className="z-1 absolute">
        <Suspense fallback={<article aria-busy="true" />}>
          <div className="w-[100vw] h-[100vh]">
            <TaskTreeComponent
              adjList={adjList}
              allTasks={allTasks}
              initNodes={initNodes}
              initEdges={initEdges}
            />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default TaskTree;

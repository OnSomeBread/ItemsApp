import type { Task, TaskAdjList } from "../../types";
import PageSwitch from "../../components/PageSwitch";
import { type Edge } from "@xyflow/react";
import TraderSelect from "../../components/TraderSelect";
import { DOCKER_BACKEND } from "../../constants";
import TaskTreeComponent from "../../components/TaskTreeComponent";

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
      data: { label: task.task_name },
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
      <div className="absolute z-2">
        <PageSwitch />
        <TraderSelect trader={trader} />
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

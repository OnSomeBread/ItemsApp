import { useEffect, useState } from "react";
import api from "../api";
import ReactFlow, { Background, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { ALL_TRADERS } from "../constants";
import type { Task } from "../types";
import { useNavigate } from "react-router-dom";

const elk = new ELK();

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
type TaskAdjList = {
  [key: string]: [string, string][];
};

function TaskTree() {
  const [adjList, setAdjList] = useState<TaskAdjList | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [queryParams, setQueryParams] = useState({
    trader: "Prapor",
    limit: 500,
  });

  // this forces adjList useEffect to only run once
  const [getAdjList] = useState(false);
  useEffect(() => {
    api
      .get("/api/adj_list")
      .then((response) => {
        setAdjList(response.data);
      })
      .catch((err) => console.log(err));
  }, [getAdjList]);

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) =>
    params.append(key, value.toString())
  );

  // grab all of the tasks that were marked completed
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("task")) params.append("ids", key.slice("task-".length));
  }

  const query = "/api/tasks?" + params.toString();

  // grab the inital tasks
  useEffect(() => {
    api
      .get<Task[]>(query)
      .then((response) => {
        setAllTasks(response.data);
      })
      .catch((err) => console.log(err));
  }, [query]);

  const initNodes =
    allTasks?.map((task) => ({
      id: task._id,
      data: { label: task.name },
    })) ?? [];

  const initEdges: Edge[] = [];
  const idToTask = new Map<string, Task>(
    allTasks?.map((task) => [task._id, task]) ?? []
  );

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
        })
      );
    });
  }

  useEffect(() => {
    if (!adjList || !allTasks) return;
    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "10",
      },
      children: initNodes.map((n) => ({
        id: n.id,
        width: 180,
        height: 40,
      })),
      edges: initEdges.map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
    };

    type ElkNode = {
      id: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };

    elk
      .layout(graph)
      .then((layoutedGraph) => {
        const layoutedNodes: Node[] = layoutedGraph.children!.map(
          (n: ElkNode) => ({
            id: n.id,
            data: { label: initNodes.find((r) => r.id === n.id)?.data.label },
            position: { x: n.x!, y: n.y! },
            style: { width: n.width, height: n.height },
          })
        );

        setNodes(layoutedNodes);
      })
      .catch((err) => console.log(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjList, allTasks?.length]);

  const navigate = useNavigate();

  if (!adjList || !allTasks) return <article aria-busy="true"></article>;

  return (
    <div>
      <select onChange={(e) => changeQueryParams("trader", e.target.value)}>
        {Object.entries(ALL_TRADERS)
          .filter((trader) => trader[0] !== "any")
          .map(([key, value]) => (
            <option key={key} value={key}>
              Trader: {value}
            </option>
          ))}
      </select>
      <div style={{ width: "100vw", height: "92vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={initEdges}
          onNodeClick={(_, node) =>
            navigate("/task_view", { state: idToTask.get(node.id) })
          }
          fitView
        >
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default TaskTree;

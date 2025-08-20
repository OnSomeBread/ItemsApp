import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, { Background, type Edge, type Node } from "reactflow";
import type { Task } from "../types";
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

type TaskAdjList = {
  [key: string]: [string, string][];
};

type InitNode = {
  id: string;
  data: {
    label: string;
  };
};

interface Props {
  adjList: TaskAdjList;
  allTasks: Task[];
  initNodes: InitNode[];
  initEdges: Edge[];
  idToTask: Map<string, Task>;
}

function TaskTreeComponent({
  adjList,
  allTasks,
  initNodes,
  initEdges,
  idToTask,
}: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    if (!adjList || !allTasks) return;
    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "50",
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
  }, [allTasks.length]);

  const navigate = useNavigate();

  return (
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
  );
}

export default TaskTreeComponent;

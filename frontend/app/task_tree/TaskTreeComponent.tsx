"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { Task } from "../../utils/types.ts";
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
}

function TaskTreeComponent({ adjList, allTasks, initNodes, initEdges }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  // Whenever nodes change, call fitView
  useEffect(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [nodes, reactFlowInstance]);

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
        width: 300,
        height: 36,
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
            style: {
              width: n.width,
              height: n.height,
              fontWeight: 450,
              fontSize: 16,
              padding: 3,
              justifyContent: "center",
            },
          })
        );

        setNodes(layoutedNodes);
      })
      .catch((err) => console.log(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks.length]);

  const router = useRouter();

  return (
    <div className="w-[100vw] h-[100vh]">
      <ReactFlow
        colorMode="dark"
        nodes={nodes}
        edges={initEdges}
        onNodeClick={(_, node) => router.push("/task_view?id=" + node.id)}
        minZoom={0.2}
        maxZoom={4}
        fitView
        elevateEdgesOnSelect={true}
        nodesDraggable={false}
        nodesConnectable={false}
        onInit={setReactFlowInstance}
      >
        <Controls showInteractive={false} />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default TaskTreeComponent;

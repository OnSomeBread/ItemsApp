import { useEffect, useState } from "react";
import api from "../api";
import ReactFlow, { Background, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
const elk = new ELK();

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
type TaskAdjList = {
  [key: string]: [string, string][];
};

function TaskTree() {
  const [adjList, setAdjList] = useState<TaskAdjList | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    api
      .get("/api/adj_list")
      .then((response) => {
        setAdjList(response.data);
      })
      .catch((err) => console.log(err));
  }, []);

  const initNodes = Object.keys(adjList ?? []).map((key) => ({
    id: key,
    data: { label: key },
  }));

  const initEdges: Edge[] = [];
  Object.entries(adjList ?? []).forEach(([key, value]) => {
    const connections = value.filter((dir) => dir[1] === "unlocks");
    connections.forEach((val) =>
      initEdges.push({ id: key + val[0], source: key, target: val[0] })
    );
  });

  console.log(adjList);

  useEffect(() => {
    console.log(adjList?.length);
    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered", // "layered", "mrtree", "radial", etc.
        "elk.direction": "DOWN", // tree grows downward
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

    elk.layout(graph).then((layoutedGraph) => {
      const layoutedNodes: Node[] = layoutedGraph.children!.map(
        (n: ElkNode) => ({
          id: n.id,
          data: { label: initNodes.find((r) => r.id === n.id)?.data.label },
          position: { x: n.x!, y: n.y! },
          style: { width: n.width, height: n.height },
        })
      );

      setNodes(layoutedNodes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjList]);

  if (!adjList) return <></>;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={initEdges} fitView>
        <Background />
        {/* <Controls />
        <MiniMap /> */}
      </ReactFlow>
    </div>
  );
}

export default TaskTree;

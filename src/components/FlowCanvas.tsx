import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from "@xyflow/react";
import type { Connection, Edge as FlowEdge, Node as FlowNode, NodeProps, NodeTypes } from "@xyflow/react";
import "../flow.css";

type CardNodeData = {
  title: string;
  description?: string;
  messageId: string;
};

const initialNodes: FlowNode<CardNodeData>[] = [
  {
    id: "n-1",
    type: "card",
    position: { x: 160, y: 160 },
    data: {
      title: "00.01 Intro",
      description:
        "This is the prompt for 00.01 Intro. Click to edit and customize this prompt for your specific use case.",
      messageId: "msg-1",
    },
  },
  {
    id: "n-2",
    type: "card",
    position: { x: 640, y: 160 },
    data: {
      title: "00.02 Project Overview",
      description: "Ask the user to describe their project and main goals to understand the scope.",
      messageId: "msg-2",
    },
  },
  {
    id: "n-3",
    type: "card",
    position: { x: 1120, y: 160 },
    data: {
      title: "00.03 Break Down Approach",
      description: "Explain the phased approach and suggest starting with an MVP.",
      messageId: "msg-4",
    },
  },
  {
    id: "n-4",
    type: "card",
    position: { x: 160, y: 400 },
    data: {
      title: "00.04 Phase 1 Steps",
      description: "List out the specific steps for Phase 1 implementation.",
      messageId: "msg-5",
    },
  },
  {
    id: "n-5",
    type: "card",
    position: { x: 640, y: 400 },
    data: {
      title: "00.05 Authentication Tips",
      description: "Provide specific recommendations for authentication implementation.",
      messageId: "msg-7",
    },
  },
  {
    id: "n-6",
    type: "card",
    position: { x: 1120, y: 400 },
    data: {
      title: "00.06 Database Setup",
      description: "Guide through database schema design and setup process.",
      messageId: "msg-8",
    },
  },
  {
    id: "n-7",
    type: "card",
    position: { x: 160, y: 640 },
    data: {
      title: "00.07 UI Framework",
      description: "Recommend frontend frameworks and UI component libraries.",
      messageId: "msg-9",
    },
  },
  {
    id: "n-8",
    type: "card",
    position: { x: 640, y: 640 },
    data: {
      title: "00.08 Testing Strategy",
      description: "Outline testing approach for different layers of the application.",
      messageId: "msg-10",
    },
  },
  {
    id: "n-9",
    type: "card",
    position: { x: 1120, y: 640 },
    data: {
      title: "00.09 Deployment",
      description: "Walk through deployment options and hosting recommendations.",
      messageId: "msg-11",
    },
  },
  {
    id: "n-10",
    type: "card",
    position: { x: 160, y: 880 },
    data: {
      title: "00.10 Next Steps",
      description: "Summarize the plan and suggest immediate next actions.",
      messageId: "msg-12",
    },
  },
  {
    id: "n-11",
    type: "card",
    position: { x: 640, y: 880 },
    data: {
      title: "00.11 Strengths Assessment",
      description: "Present the strengths card with illustration and question to guide user reflection.",
      messageId: "msg-13",
    },
  },
  {
    id: "n-12",
    type: "card",
    position: { x: 1120, y: 880 },
    data: {
      title: "00.12 Strengths Selection",
      description: "Present interactive pill options for users to select their strengths.",
      messageId: "msg-14",
    },
  },
];

const initialEdges: FlowEdge[] = [
  { id: "e-1-2", source: "n-1", target: "n-2" },
  { id: "e-2-3", source: "n-2", target: "n-3" },
  { id: "e-3-4", source: "n-3", target: "n-4" },
  { id: "e-4-5", source: "n-4", target: "n-5" },
  { id: "e-5-6", source: "n-5", target: "n-6" },
  { id: "e-6-7", source: "n-6", target: "n-7" },
  { id: "e-7-8", source: "n-7", target: "n-8" },
  { id: "e-8-9", source: "n-8", target: "n-9" },
  { id: "e-9-10", source: "n-9", target: "n-10" },
  { id: "e-10-11", source: "n-10", target: "n-11" },
  { id: "e-11-12", source: "n-11", target: "n-12" },
];

export default function FlowCanvas() {
  const [nodes, , onNodesChange] = useNodesState<FlowNode<CardNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  useEffect(() => {
    const handleHighlightNode = (event: CustomEvent) => {
      const { messageId } = event.detail;
      const node = nodes.find((n) => n.data.messageId === messageId);
      if (node) {
        setHighlightedNodeId(node.id);
      }
    };

    const handleUnhighlightNode = () => {
      setHighlightedNodeId(null);
    };

    window.addEventListener("highlightNode", handleHighlightNode as EventListener);
    window.addEventListener("unhighlightNode", handleUnhighlightNode as EventListener);

    return () => {
      window.removeEventListener("highlightNode", handleHighlightNode as EventListener);
      window.removeEventListener("unhighlightNode", handleUnhighlightNode as EventListener);
    };
  }, [nodes]);

  // CardNode component defined inside FlowCanvas to access state
  function CardNode({ data, id }: NodeProps) {
    const d = data as CardNodeData;
    const isHighlighted = highlightedNodeId === id;

    const handleNodeClick = () => {
      // Dispatch custom event to scroll to corresponding message
      const event = new CustomEvent("scrollToMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    const handleNodeMouseEnter = () => {
      // Dispatch custom event to highlight corresponding message
      const event = new CustomEvent("highlightMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    const handleNodeMouseLeave = () => {
      // Dispatch custom event to unhighlight corresponding message
      const event = new CustomEvent("unhighlightMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    return (
      <div
        className={`card-node ${isHighlighted ? "node-highlighted" : ""}`}
        onClick={handleNodeClick}
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
      >
        <div className="card-node__title">{d.title}</div>
        {d.description && <div className="card-node__desc">{d.description}</div>}

        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  const nodeTypes: NodeTypes = { card: CardNode };

  return (
    <div style={{ width: "calc(100% - 400px)", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

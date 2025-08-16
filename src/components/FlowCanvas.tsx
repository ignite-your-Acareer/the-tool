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
import type { Connection, Edge as FlowEdge, Node as FlowNode, NodeProps, NodeTypes, NodeChange } from "@xyflow/react";
import "../flow.css";

type UIToolType = "message" | "question" | "form" | "freeChat" | "accordion" | "banner" | "intro" | "multiSelect";

// Comprehensive component data structure - single source of truth
type ComponentData = {
  id: string;                    // Unique component ID
  name: string;                  // Display name (required)
  slug: string;                  // Slug ID like "01.03.06" (required)
  uiToolType: UIToolType;        // UI tool type
  content: {
    message?: { text: string; richText?: boolean; };
    question?: { text: string; options: string[]; };
    form?: { fields: Record<string, unknown>[]; };
    freeChat?: { text: string; };
    accordion?: { title: string; content: string; };
    banner?: { text: string; type: string; };
    intro?: { text: string; };
    multiSelect?: { text: string; options: string[]; };
  };
  createdAt: Date;
  updatedAt: Date;
};

type CardNodeData = {
  componentId: string;           // References ComponentData.id
  messageId: string;             // Legacy field for backward compatibility
};

const initialNodes: FlowNode<CardNodeData>[] = [];

const initialEdges: FlowEdge[] = [];

export default function FlowCanvas() {
  // Central component data store - single source of truth
  const [components, setComponents] = useState<Map<string, ComponentData>>(new Map());
  
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<CardNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [lastClickedNodeId, setLastClickedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string; componentName: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rightClickedMessageId?: string; } | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  const searchNodes = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults(new Set());
      return;
    }

    const results = new Set<string>();
    const lowerQuery = query.toLowerCase();

    nodes.forEach(node => {
      const component = components.get(node.data.componentId);
      if (component) {
        // Search in component name
        if (component.name.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in slug
        if (component.slug.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in message content
        if (component.content.message?.text?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in banner content
        if (component.content.banner?.text?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in question content
        if (component.content.question?.text?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in form content
        if (component.content.form?.fields?.some(field => 
          JSON.stringify(field).toLowerCase().includes(lowerQuery)
        )) {
          results.add(node.id);
        }
        // Search in freeChat content
        if (component.content.freeChat?.text?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in accordion content
        if (component.content.accordion?.title?.toLowerCase().includes(lowerQuery) ||
            component.content.accordion?.content?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in intro content
        if (component.content.intro?.text?.toLowerCase().includes(lowerQuery)) {
          results.add(node.id);
        }
        // Search in multiSelect content
        if (component.content.multiSelect?.text?.toLowerCase().includes(lowerQuery) ||
            component.content.multiSelect?.options?.some(option => 
              option.toLowerCase().includes(lowerQuery)
            )) {
          results.add(node.id);
        }
      }
    });

    setSearchResults(results);
  }, [nodes, components]);

  const onNodesChangeCustom = useCallback((changes: NodeChange<FlowNode<CardNodeData>>[]) => {
    console.log('Node changes:', changes);
    console.log('Selected nodes:', selectedNodeIds);
    
    // Handle group dragging
    const dragChanges = changes.filter((change: NodeChange<FlowNode<CardNodeData>>) => change.type === 'position' && 'dragging' in change && change.dragging);
    
    if (dragChanges.length > 0 && selectedNodeIds.size > 1) {
      console.log('Group dragging detected');
      
      // Find the node being dragged
      const draggedNode = dragChanges[0];
      const draggedNodeId = 'id' in draggedNode ? draggedNode.id : undefined;
      
      if (draggedNodeId && selectedNodeIds.has(draggedNodeId)) {
        console.log('Dragged node is in selection:', draggedNodeId);
        
        // Calculate the offset from the original position
        const originalNode = nodes.find(n => n.id === draggedNodeId);
        if (originalNode && 'position' in draggedNode && draggedNode.position) {
          const deltaX = draggedNode.position.x - originalNode.position.x;
          const deltaY = draggedNode.position.y - originalNode.position.y;
          
          console.log('Delta:', { deltaX, deltaY });
          
          // Move all selected nodes by the same offset
          const updatedNodes = nodes.map(node => {
            if (selectedNodeIds.has(node.id)) {
              console.log('Moving node:', node.id);
              return {
                ...node,
                position: {
                  x: node.position.x + deltaX,
                  y: node.position.y + deltaY,
                },
              };
            }
            return node;
          });
          
          setNodes(updatedNodes);
          return; // Don't call the default handler
        }
      }
    }
    
    // Handle regular node changes
    onNodesChange(changes);
  }, [selectedNodeIds, nodes, setNodes, onNodesChange]);

  const addNewComponent = useCallback(() => {
    const componentId = `comp-${Date.now()}`;
    const newNodeId = `n-${nodes.length + 1}`;
    const newMessageId = `msg-${nodes.length + 1}`;
    
    // Array of professional/coaching placeholder texts
    const placeholderTexts = [
      "What tasks are easy for you but hard for others? Think about the skills that come naturally to you and how they might be valuable in your career.",
      "Awesome - now that we've got a feel for your personality, let's dig into your strengths. You'll see a few sample answers to guide you.",
      "Tell me about a time when you felt most confident at work. What were you doing, and what made you feel so capable in that moment?",
      "Let's explore your communication style. How do you prefer to give and receive feedback? Are you more direct or diplomatic?",
      "Great progress! Now let's look at your work preferences. What kind of environment helps you perform at your best?",
      "What would your colleagues say is your biggest strength? Sometimes others see qualities in us that we take for granted.",
      "Let's talk about challenges. What's a problem you've solved recently that you're particularly proud of?",
      "Excellent work so far! Now let's focus on your goals. Where do you see yourself professionally in the next 2-3 years?",
      "What motivates you to do your best work? Is it recognition, helping others, solving complex problems, or something else?",
      "Let's explore your learning style. How do you prefer to acquire new skills - through hands-on experience, formal training, or mentoring?",
      "Perfect! Now let's wrap up with your values. What's most important to you in a work environment - collaboration, autonomy, innovation, or stability?"
    ];
    
    // Cycle through placeholder texts
    const textIndex = nodes.length % placeholderTexts.length;
    const selectedText = placeholderTexts[textIndex];
    
    // Create new component data
    const newComponent: ComponentData = {
      id: componentId,
      name: `New Component ${nodes.length + 1}`,
      slug: "",
      uiToolType: "message", // Default to message
      content: {
        message: { text: selectedText, richText: true },
        banner: { text: "New Banner", type: "default" }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add to central component store
    setComponents(prev => new Map(prev).set(componentId, newComponent));
    
    const newNode: FlowNode<CardNodeData> = {
      id: newNodeId,
      type: "card",
      position: { x: 480 + (nodes.length % 3) * 480, y: 120 + Math.floor(nodes.length / 3) * 120 },
      data: {
        componentId: componentId,
        messageId: newMessageId,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Add edge from last node to new node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      const newEdge: FlowEdge = {
        id: `e-${lastNode.id}-${newNodeId}`,
        source: lastNode.id,
        target: newNodeId,
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    // Dispatch event to add message to conversation
    const event = new CustomEvent("addMessage", {
      detail: { 
        messageId: newMessageId,
        componentId: componentId,
        uiToolType: "message",
        showDropdown: false 
      },
    });
    window.dispatchEvent(event);
    
    // Dispatch component data immediately
    const componentDataEvent = new CustomEvent("updateComponentData", {
      detail: { 
        messageId: newMessageId, 
        componentData: newComponent 
      },
    });
    window.dispatchEvent(componentDataEvent);
  }, [nodes, setNodes, setEdges]);

  const deleteComponent = useCallback((messageIds: string | string[]) => {
    const messageIdArray = Array.isArray(messageIds) ? messageIds : [messageIds];
    
    // Find all nodes to delete
    const nodesToDelete = nodes.filter(node => messageIdArray.includes(node.data.messageId));
    if (nodesToDelete.length === 0) return;

    // Remove the nodes
    setNodes((nds) => nds.filter(node => !messageIdArray.includes(node.data.messageId)));

    // Remove edges connected to these nodes
    const nodeIdsToDelete = nodesToDelete.map(node => node.id);
    setEdges((eds) => eds.filter(edge => 
      !nodeIdsToDelete.includes(edge.source) && !nodeIdsToDelete.includes(edge.target)
    ));

    // Reconnect edges if needed (connect previous node to next node)
    // This is a simplified approach - for multiple deletions, we'll just remove the edges
    // and let the user reconnect manually if needed

    // Dispatch events to delete messages from conversation
    messageIdArray.forEach(messageId => {
      const event = new CustomEvent("deleteMessage", {
        detail: { messageId },
      });
      window.dispatchEvent(event);
    });
  }, [nodes, setNodes, setEdges]);

  // Calculate order based on edge connections
  const calculateNodeOrder = useCallback(() => {
    if (nodes.length === 0) return [];
    
    const order: string[] = [];
    const visited = new Set<string>();
    const excludedNodes = new Set<string>(); // Track nodes that should be excluded
    
    // Find nodes without incoming edges (start nodes)
    const hasIncomingEdge = new Set<string>();
    edges.forEach(edge => {
      hasIncomingEdge.add(edge.target);
    });
    
    const startNodes = nodes.filter(node => !hasIncomingEdge.has(node.id));
    
    // If no clear start nodes, use first node
    if (startNodes.length === 0 && nodes.length > 0) {
      startNodes.push(nodes[0]);
    }
    
    // Find all convergence points (nodes with multiple incoming edges)
    const convergencePoints = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!convergencePoints.has(edge.target)) {
        convergencePoints.set(edge.target, []);
      }
      convergencePoints.get(edge.target)!.push(edge.source);
    });
    
    // For each convergence point, mark the non-top branches as excluded
    convergencePoints.forEach((sourceNodes) => {
      if (sourceNodes.length > 1) {
        // Multiple sources converging to this target
        const sourceNodeObjects = sourceNodes.map(sourceId => nodes.find(n => n.id === sourceId)).filter(Boolean);
        const topSourceNode = sourceNodeObjects.reduce((top, current) => 
          current && top && current.position.y < top.position.y ? current : top
        );
        
        // Mark all other source nodes as excluded
        sourceNodeObjects.forEach(sourceNode => {
          if (sourceNode && sourceNode !== topSourceNode) {
            excludedNodes.add(sourceNode.id);
          }
        });
      }
    });
    
    // Traverse from start nodes, excluding marked nodes
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId) || excludedNodes.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        order.push(node.data.messageId);
      }
      
      // Find outgoing edges
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        if (!excludedNodes.has(edge.target)) {
          traverse(edge.target);
        }
      });
    };
    
    // Start traversal from each start node
    startNodes.forEach(node => traverse(node.id));
    
    // Add orphan nodes (nodes not in the order and not excluded)
    nodes.forEach(node => {
      if (!visited.has(node.id) && !excludedNodes.has(node.id)) {
        order.push(node.data.messageId);
      }
    });
    
    return order;
  }, [nodes, edges]);

  // Sync order to preview window
  const syncOrderToPreview = useCallback(() => {
    const order = calculateNodeOrder();
    
    // Calculate orphan message IDs
    const orphanIds: string[] = [];
    nodes.forEach(node => {
      const isOrphan = !edges.some(edge => edge.target === node.id);
      const hasOutgoingEdges = edges.some(edge => edge.source === node.id);
      if (isOrphan && !hasOutgoingEdges) {
        orphanIds.push(node.data.messageId);
      }
    });
    
    const event = new CustomEvent("syncMessageOrder", {
      detail: { order, orphanIds },
    });
    window.dispatchEvent(event);
  }, [calculateNodeOrder, nodes, edges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNodeIds.size > 0 && !isTestMode) {
        event.preventDefault();
        
        // Get all selected message IDs
        const selectedMessageIds = Array.from(selectedNodeIds).map(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          return node?.data.messageId;
        }).filter(Boolean);
        
        // Get component names for confirmation
        const componentNames = selectedMessageIds.map(messageId => {
          const node = nodes.find(n => n.data.messageId === messageId);
          if (node) {
            const component = components.get(node.data.componentId);
            return component?.name || "Component";
          }
          return "Component";
        });
        
        const componentNameText = selectedMessageIds.length === 1 
          ? componentNames[0] 
          : `${selectedMessageIds.length} components`;
        
        setDeleteConfirmation({ 
          messageId: selectedMessageIds.join(','), 
          componentName: componentNameText 
        });
      }
    };

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

    const handleUpdateNode = (event: CustomEvent) => {
      const { messageId, uiToolType, showDropdown } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.data.messageId === messageId
            ? { ...node, data: { ...node.data, uiToolType, showDropdown } }
            : node
        )
      );
    };

    const handleDeleteNode = (event: CustomEvent) => {
      const { messageId } = event.detail;
      deleteComponent(messageId);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("highlightNode", handleHighlightNode as EventListener);
    window.addEventListener("unhighlightNode", handleUnhighlightNode as EventListener);
    window.addEventListener("updateNode", handleUpdateNode as EventListener);
    window.addEventListener("deleteNode", handleDeleteNode as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("highlightNode", handleHighlightNode as EventListener);
      window.removeEventListener("unhighlightNode", handleUnhighlightNode as EventListener);
      window.removeEventListener("updateNode", handleUpdateNode as EventListener);
      window.removeEventListener("deleteNode", handleDeleteNode as EventListener);
    };
  }, [nodes, deleteComponent]);

  // Sync order whenever nodes or edges change
  useEffect(() => {
    syncOrderToPreview();
  }, [nodes, edges, syncOrderToPreview]);

  // Search nodes when query changes
  useEffect(() => {
    searchNodes(searchQuery);
  }, [searchQuery, searchNodes]);

  useEffect(() => {
    const handleUpdateNodeContent = (event: CustomEvent) => {
      const { messageId, content } = event.detail;
      setNodes(prev => 
        prev.map(node => 
          node.data.messageId === messageId 
            ? { ...node, data: { ...node.data, title: content } }
            : node
        )
      );
    };

    const handleSelectNode = (event: CustomEvent) => {
      const { messageId } = event.detail;
      const node = nodes.find(n => n.data.messageId === messageId);
      if (node) {
        setSelectedNodeIds(new Set([node.id]));
        setLastClickedNodeId(node.id);
        
        // Dispatch event to update preview window selection
        const selectionEvent = new CustomEvent("nodeSelection", {
          detail: { selectedMessageIds: [messageId] },
        });
        window.dispatchEvent(selectionEvent);
      }
    };

    const handleEnterTestMode = () => {
      setIsTestMode(true);
    };

    const handleExitTestMode = () => {
      setIsTestMode(false);
    };

    const handleOpenEditWindow = (event: CustomEvent) => {
      const { messageId } = event.detail;
      setEditingMessageId(messageId);
    };

    window.addEventListener("updateNodeContent", handleUpdateNodeContent as EventListener);
    window.addEventListener("selectNode", handleSelectNode as EventListener);
    window.addEventListener("enterTestMode", handleEnterTestMode as EventListener);
    window.addEventListener("exitTestMode", handleExitTestMode as EventListener);
    window.addEventListener("openEditWindow", handleOpenEditWindow as EventListener);

    return () => {
      window.removeEventListener("updateNodeContent", handleUpdateNodeContent as EventListener);
      window.removeEventListener("selectNode", handleSelectNode as EventListener);
      window.removeEventListener("enterTestMode", handleEnterTestMode as EventListener);
      window.removeEventListener("exitTestMode", handleExitTestMode as EventListener);
      window.removeEventListener("openEditWindow", handleOpenEditWindow as EventListener);
    };
  }, [setNodes, nodes]);

  // CardNode component defined inside FlowCanvas to access state
  function CardNode({ data, id }: NodeProps) {
    const d = data as CardNodeData;
    const isHighlighted = highlightedNodeId === id;
    
    // Get component data from central store
    const component = components.get(d.componentId);
    if (!component) {
      return <div>Component not found</div>;
    }

    const handleNodeClick = (e: React.MouseEvent) => {
      // Disable node interactions in test mode
      if (isTestMode) return;
      
      // Handle shift-click range selection
      if (e.shiftKey && lastClickedNodeId && lastClickedNodeId !== id) {
        // Get the range of nodes to select
        const nodeIds = nodes.map(node => node.id);
        const startIndex = nodeIds.indexOf(lastClickedNodeId);
        const endIndex = nodeIds.indexOf(id);
        
        if (startIndex !== -1 && endIndex !== -1) {
          const start = Math.min(startIndex, endIndex);
          const end = Math.max(startIndex, endIndex);
          const rangeIds = nodeIds.slice(start, end + 1);
          
          // Select the range of nodes
          setSelectedNodeIds(new Set(rangeIds));
          console.log('Shift-click selected range:', rangeIds);
          console.log('Selection size:', rangeIds.length);
          
          // Dispatch event to update preview window selection
          const selectedMessageIds = rangeIds.map(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            return node?.data.messageId;
          }).filter(Boolean);
          
          const event = new CustomEvent("nodeSelection", {
            detail: { selectedMessageIds },
          });
          window.dispatchEvent(event);
        }
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl + click for multi-select
        const newSelection = new Set(selectedNodeIds);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }
        setSelectedNodeIds(newSelection);
        setLastClickedNodeId(id);
        console.log('Cmd/Ctrl-click selection:', Array.from(newSelection));
        console.log('Selection size:', newSelection.size);
        
        // Dispatch event to update preview window selection
        const selectedMessageIds = Array.from(newSelection).map(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          return node?.data.messageId;
        }).filter(Boolean);
        
        const event = new CustomEvent("nodeSelection", {
          detail: { selectedMessageIds },
        });
        window.dispatchEvent(event);
              } else {
          // Regular click - update last clicked node and clear selection
          setLastClickedNodeId(id);
          setSelectedNodeIds(new Set([id]));
          
          // Dispatch event to update preview window selection
          const event = new CustomEvent("nodeSelection", {
            detail: { selectedMessageIds: [d.messageId] },
          });
          window.dispatchEvent(event);
      }

      // Dispatch custom event to scroll to corresponding message
      const event = new CustomEvent("scrollToMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    const handleNodeRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only show context menu if node is selected
      if (selectedNodeIds.has(id)) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          rightClickedMessageId: d.messageId
        });
      }
    };

    const handleNodeMouseEnter = () => {
      // Disable hover effects in test mode
      if (isTestMode) return;
      
      // Dispatch custom event to highlight corresponding message
      const event = new CustomEvent("highlightMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    const handleNodeMouseLeave = () => {
      // Disable hover effects in test mode
      if (isTestMode) return;
      
      // Dispatch custom event to unhighlight corresponding message
      const event = new CustomEvent("unhighlightMessage", {
        detail: { messageId: d.messageId },
      });
      window.dispatchEvent(event);
    };

    // Check if this node is an orphan (no incoming edges)
    const isOrphan = !edges.some(edge => edge.target === id);
    const hasOutgoingEdges = edges.some(edge => edge.source === id);
    const isSelected = selectedNodeIds.has(id);
    const isSearchResult = searchResults.has(id);
    
    return (
      <div
        className={`card-node ${isHighlighted ? "node-highlighted" : ""} ${isOrphan && !hasOutgoingEdges ? "node-orphan" : ""} ${isSelected ? "node-selected" : ""} ${isSearchResult ? "node-search-result" : ""}`}
        onClick={handleNodeClick}
        onContextMenu={handleNodeRightClick}
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
      >
        <div className="card-node__title">{component.name}</div>
        <div className="card-node__slug" style={{ 
          position: "absolute",
          bottom: "8px",
          right: "8px",
          fontSize: "12px",
          color: "#FFF",
          fontWeight: "500"
        }}>
          {component.slug}
        </div>
        {component.uiToolType === "banner" ? (
          <div className="card-node__desc" style={{
            fontSize: "12px",
            color: "#FFF",
            marginTop: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "200px"
          }}>
            {component.content.banner?.text || "New Banner"}
          </div>
        ) : component.content.message?.text && (
          <div className="card-node__desc" style={{
            fontSize: "12px",
            color: "#FFF",
            marginTop: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "200px"
          }}>
            {component.content.message.text.substring(0, 50)}
            {component.content.message.text.length > 50 ? "..." : ""}
          </div>
        )}
        {component.uiToolType && (
          <div className="card-node__tool-type" style={{ 
            marginTop: "8px", 
            fontSize: "11px", 
            color: "#F16B68", 
            fontWeight: "600",
            textTransform: "uppercase"
          }}>
            {component.uiToolType}
          </div>
        )}
        


        <button
          className="three-dots-menu"
          onClick={(e) => {
            e.stopPropagation();
            if (!isTestMode) {
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                rightClickedMessageId: d.messageId
              });
            }
          }}
        >
          ⋯
        </button>

        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  const nodeTypes: NodeTypes = { card: CardNode };

  return (
    <div 
      style={{ width: isTestMode ? "100%" : "calc(100% - 400px)", height: "100vh", position: "relative" }}
      onClick={() => {
        if (isTestMode) {
          const event = new CustomEvent("showExitTestWarning");
          window.dispatchEvent(event);
        }
      }}
    >
      {isTestMode && (
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(60, 40, 30, 0.75)",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        />
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeCustom}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={(event, edge) => {
          event.preventDefault();
          setEdges(prev => prev.filter(e => e.id !== edge.id));
        }}
        nodeTypes={nodeTypes}
        nodesFocusable={false}
        nodesConnectable={true}
        elementsSelectable={false}
        fitView
        snapToGrid={true}
        snapGrid={[480, 120]}
        className={searchQuery ? "searching" : ""}
        onPaneClick={() => {
          // Clear selection when clicking on empty space
          setSelectedNodeIds(new Set());
          setLastClickedNodeId(null);
          
          // Close context menu when clicking outside
          if (contextMenu) {
            setContextMenu(null);
          }
          
          // Dispatch event to clear preview window selection
          const event = new CustomEvent("nodeSelection", {
            detail: { selectedMessageIds: [] },
          });
          window.dispatchEvent(event);
        }}
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background />
      </ReactFlow>
      
      <button 
        className="add-component-btn"
        onClick={addNewComponent}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          background: "#F16B68",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          outline: "none",
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = "0 0 0 2px rgba(241, 107, 104, 0.3)";
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
        }}
      >
        Add Component
      </button>

      {/* Search Bar */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "300px",
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search components..."
          style={{
            flex: 1,
            padding: "12px 16px",
            paddingRight: searchQuery ? "40px" : "16px",
            border: "1px solid #E9DDD3",
            borderRadius: "8px",
            fontSize: "14px",
            background: "white",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            position: "relative",
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = "0 0 0 2px rgba(241, 107, 104, 0.3)";
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              left: "265px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#666",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 11,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="edit-window-overlay">
          <div className="edit-window">
            <div className="edit-window-header">
              <h4>Delete Component</h4>
            </div>
            <div className="edit-window-content">
              <p>Are you sure you want to delete "{deleteConfirmation.componentName}"?</p>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="edit-window-footer">
              <button
                className="save-btn"
                onClick={() => {
                  const messageIds = deleteConfirmation.messageId.split(',');
                  deleteComponent(messageIds);
                  setDeleteConfirmation(null);
                }}
                style={{
                  background: "#F16B68",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setDeleteConfirmation(null)}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginLeft: "8px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu-overlay"
          onClick={() => setContextMenu(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <div 
            className="context-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: contextMenu.x - 150, // Offset to the left by menu width
              top: contextMenu.y,
              background: "white",
              border: "1px solid #E9DDD3",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 1001,
              minWidth: "150px",
            }}
          >
            <button
              onClick={() => {
                // Edit only the right-clicked component
                if (contextMenu.rightClickedMessageId) {
                  setEditingMessageId(contextMenu.rightClickedMessageId);
                }
                setContextMenu(null);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                color: "#FA8072",
                fontWeight: "500",
                borderBottom: "1px solid #E9DDD3",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                // Get all selected message IDs
                const selectedMessageIds = Array.from(selectedNodeIds).map(nodeId => {
                  const node = nodes.find(n => n.id === nodeId);
                  return node?.data.messageId;
                }).filter(Boolean);
                
                // Get component names for confirmation
                const componentNames = selectedMessageIds.map(messageId => {
                  const node = nodes.find(n => n.data.messageId === messageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    return component?.name || "Component";
                  }
                  return "Component";
                });
                
                const componentNameText = selectedMessageIds.length === 1 
                  ? componentNames[0] 
                  : `${selectedMessageIds.length} components`;
                
                setDeleteConfirmation({ 
                  messageId: selectedMessageIds.join(','), 
                  componentName: componentNameText 
                });
                setContextMenu(null);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                color: "#F16B68",
                fontWeight: "500",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit Window */}
      {editingMessageId && (
        <div className="edit-window-overlay">
          <div className="edit-window">
            <div className="edit-window-header">
              <h4>Edit Message</h4>
              <button
                className="close-edit-btn"
                onClick={() => setEditingMessageId(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#003250",
                }}
              >
                ×
              </button>
            </div>
            <div className="edit-window-content">
              <label>Component Name:</label>
              <input
                type="text"
                value={(() => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (!node) return "";
                  const component = components.get(node.data.componentId);
                  return component?.name || "";
                })()}
                onChange={(e) => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      const updatedComponent = {
                        ...component,
                        name: e.target.value,
                        updatedAt: new Date()
                      };
                      setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                      
                      // Dispatch event to update preview
                      const event = new CustomEvent("updateComponentData", {
                        detail: { 
                          messageId: editingMessageId, 
                          componentData: updatedComponent 
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }
                }}
                placeholder="Enter component name..."
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E9DDD3",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  marginBottom: "16px",
                }}
              />
              
              <label>Slug:</label>
              <input
                type="text"
                value={(() => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (!node) return "";
                  const component = components.get(node.data.componentId);
                  return component?.slug || "";
                })()}
                onChange={(e) => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      const updatedComponent = {
                        ...component,
                        slug: e.target.value,
                        updatedAt: new Date()
                      };
                      setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                      
                      // Dispatch event to update preview
                      const event = new CustomEvent("updateComponentData", {
                        detail: { 
                          messageId: editingMessageId, 
                          componentData: updatedComponent 
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }
                }}
                placeholder="e.g., 01.03.06"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E9DDD3",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  marginBottom: "16px",
                }}
              />
              
              <label>UI Tool Type:</label>
              <select
                value={(() => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (!node) return "message";
                  const component = components.get(node.data.componentId);
                  return component?.uiToolType || "message";
                })()}
                onChange={(e) => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      const newUiToolType = e.target.value as UIToolType;
                      const updatedComponent = {
                        ...component,
                        uiToolType: newUiToolType,
                        updatedAt: new Date()
                      };
                      setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                      
                      // Dispatch component data update first
                      const componentDataEvent = new CustomEvent("updateComponentData", {
                        detail: { 
                          messageId: editingMessageId, 
                          componentData: updatedComponent 
                        },
                      });
                      window.dispatchEvent(componentDataEvent);
                      
                      // Then dispatch event to update preview with new UI tool type
                      const event = new CustomEvent("updateMessage", {
                        detail: { 
                          messageId: editingMessageId, 
                          uiToolType: newUiToolType, 
                          showDropdown: false 
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E9DDD3",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  marginBottom: "16px",
                }}
              >
                <option value="message">Message</option>
                <option value="question">Question</option>
                <option value="form">Form</option>
                <option value="freeChat">Free Chat</option>
                <option value="accordion">Accordion</option>
                <option value="banner">Banner</option>
                <option value="intro">Intro</option>
                <option value="multiSelect">Multi Select</option>
              </select>
              
              {(() => {
                const node = nodes.find(n => n.data.messageId === editingMessageId);
                if (!node) return null;
                const component = components.get(node.data.componentId);
                const uiToolType = component?.uiToolType || "message";
                
                if (uiToolType === "banner") {
                  return (
                    <>
                      <label>Banner Title:</label>
                      <input
                        type="text"
                        value={component?.content.banner?.text || ""}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  banner: {
                                    text: e.target.value,
                                    type: "default"
                                  }
                                },
                                updatedAt: new Date()
                              };
                              setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                              
                              // Dispatch event to update preview
                              const event = new CustomEvent("updateComponentData", {
                                detail: { 
                                  messageId: editingMessageId, 
                                  componentData: updatedComponent 
                                },
                              });
                              window.dispatchEvent(event);
                            }
                          }
                        }}
                        placeholder="Enter banner title (e.g., 'Strengths')..."
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                        }}
                      />
                    </>
                  );
                } else {
                  return (
                    <>
                      <label>Message Content:</label>
                      <textarea
                        value={component?.content.message?.text || ""}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  message: {
                                    ...component.content.message,
                                    text: e.target.value
                                  }
                                },
                                updatedAt: new Date()
                              };
                              setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                              
                              // Dispatch event to update preview
                              const event = new CustomEvent("updateComponentData", {
                                detail: { 
                                  messageId: editingMessageId, 
                                  componentData: updatedComponent 
                                },
                              });
                              window.dispatchEvent(event);
                            }
                          }
                        }}
                        placeholder="Enter your message content..."
                        style={{
                          width: "100%",
                          minHeight: "100px",
                          padding: "12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </>
                  );
                }
              })()}
            </div>
            <div className="edit-window-footer">
              <button
                className="save-btn"
                onClick={() => {
                  // Dispatch event to update preview message based on UI tool type
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      const content = component.uiToolType === "banner" 
                        ? component.content.banner?.text || ""
                        : component.content.message?.text || "";
                        
                      const event = new CustomEvent("updateMessageContent", {
                        detail: { 
                          messageId: editingMessageId, 
                          content: content
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }
                  setEditingMessageId(null);
                }}
                style={{
                  background: "#F16B68",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => setEditingMessageId(null)}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginLeft: "8px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

import defaultState from "../defaultState";

type UIToolType = "message" | "question" | "form" | "freeChat" | "accordion" | "intro" | "multiSelect";

// Comprehensive component data structure - single source of truth
type MultiSelectOption = {
  text: string;
  image?: string;
  icon?: string;
};

type FormField = {
  id: string;
  type: "currency" | "text" | "longText" | "dropdown" | "radio" | "checkbox";
  title: string;
  options?: string[];
  required?: boolean;
};

type ComponentData = {
  id: string;                    // Unique component ID
  name: string;                  // Display name (required)
  slug: string;                  // Slug ID like "01.03.06" (required)
  uiToolType: UIToolType;        // UI tool type
  content: {
    message?: { text: string; richText?: boolean; };
    question?: { text?: string; options?: string[]; image?: string; suggestions?: string[]; };
    form?: { 
      fields: FormField[];
      title?: string;
      sendButtonText?: string;
    };
    aiPrompt?: {
      text?: string;
      llm?: string;
    };
    freeChat?: { text: string; };
    accordion?: { title: string; content: string; };
    banner?: { text: string; type: string; };
    intro?: { text: string; };
    multiSelect?: { 
      text?: string; 
      options?: MultiSelectOption[]; 
      maxSelection?: number;
    };
  };
  aiGenerated?: boolean;         // AI-generated flag
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
  const [originalComponentData, setOriginalComponentData] = useState<ComponentData | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string; componentName: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rightClickedMessageId?: string; } | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
  const [imageDropdownOpen, setImageDropdownOpen] = useState<string | false>(false);
  const [uiToolTypeDropdownOpen, setUiToolTypeDropdownOpen] = useState(false);
  const [bannerAddOn, setBannerAddOn] = useState(false);
  const [textAddOn, setTextAddOn] = useState(false);
  const [branchRoutingAddOn, setBranchRoutingAddOn] = useState(false);
  const [moveOnButtonAddOn, setMoveOnButtonAddOn] = useState(false);
  const [celebrationModalAddOn, setCelebrationModalAddOn] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Navigation bar state
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [selectedTrack, setSelectedTrack] = useState("clarity");
  const [selectedSegment, setSelectedSegment] = useState("all-ai-generated");
  const [selectedUser, setSelectedUser] = useState("user1");
  const [showImagesPopup, setShowImagesPopup] = useState(false);

  // Mock users data
  const mockUsers = [
    { id: "user1", name: "Sarah Chen", age: 22, description: "Ambitious tech enthusiast" },
    { id: "user2", name: "Marcus Rodriguez", age: 24, description: "Creative problem solver" },
    { id: "user3", name: "Emily Watson", age: 26, description: "Analytical team leader" },
    { id: "user4", name: "David Kim", age: 23, description: "Innovative startup founder" },
    { id: "user5", name: "Jessica Patel", age: 25, description: "Strategic communicator" },
    { id: "user6", name: "Alex Thompson", age: 27, description: "Data-driven decision maker" },
    { id: "user7", name: "Maria Garcia", age: 24, description: "Customer-focused designer" },
    { id: "user8", name: "James Wilson", age: 26, description: "Results-oriented manager" },
    { id: "user9", name: "Lisa Anderson", age: 25, description: "Collaborative team player" },
    { id: "user10", name: "Ryan O'Connor", age: 23, description: "Adaptive quick learner" },
    { id: "user11", name: "Amanda Foster", age: 28, description: "Experienced mentor" },
    { id: "user12", name: "Kevin Zhang", age: 24, description: "Technical innovator" },
  ];

  // Calculate zoom limits based on node positions and sizes
  const calculateZoomLimits = useCallback(() => {
    if (nodes.length === 0) {
      return { minZoom: 0.1, maxZoom: 2 };
    }

    // Node dimensions (approximate based on typical card size)
    const nodeWidth = 200;
    const nodeHeight = 120;
    const nodePadding = 20;

    // Calculate bounds of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      const nodeLeft = node.position.x;
      const nodeRight = node.position.x + nodeWidth;
      const nodeTop = node.position.y;
      const nodeBottom = node.position.y + nodeHeight;
      
      minX = Math.min(minX, nodeLeft);
      maxX = Math.max(maxX, nodeRight);
      minY = Math.min(minY, nodeTop);
      maxY = Math.max(maxY, nodeBottom);
    });

    // Add padding to bounds
    const boundsWidth = maxX - minX + nodePadding * 2;
    const boundsHeight = maxY - minY + nodePadding * 2;

    // Calculate max zoom out to fit all nodes
    // Assuming viewport is approximately 1200x800 (typical canvas size)
    const viewportWidth = 1200;
    const viewportHeight = 800;
    
    const zoomX = viewportWidth / boundsWidth;
    const zoomY = viewportHeight / boundsHeight;
    const maxZoomOut = Math.min(zoomX, zoomY, 1); // Don't zoom out more than 1x

    // Calculate min zoom in (zoom until only one node is visible)
    // This means the node should fill most of the viewport
    const minZoomIn = Math.max(viewportWidth / (nodeWidth * 1.5), viewportHeight / (nodeHeight * 1.5));

    return {
      minZoom: Math.max(0.1, maxZoomOut), // Max zoom out (fit all nodes)
      maxZoom: Math.min(5, minZoomIn)     // Min zoom in (single node visible)
    };
  }, [nodes]);

  const zoomLimits = calculateZoomLimits();

  
  // UI Tool Type options - single source of truth
  const uiToolTypeOptions = [
    { value: "message", label: "Message" },
    { value: "question", label: "Question" },
    { value: "multiSelect", label: "Multi Select" },
    { value: "form", label: "Form" },
    { value: "freeChat", label: "Free Chat", disabled: true },
    { value: "accordion", label: "Accordion", disabled: true },
    { value: "intro", label: "Intro Dialog", disabled: true },
    { value: "showTracksDrawer", label: "Show Tracks Drawer", disabled: true },
    { value: "assessment", label: "Assessment", disabled: true },
    { value: "swissArmyKnife", label: "Swiss Army Knife", disabled: true },
  ];
  
  // Available images for dropdown - all actual files from public/img folder
  const availableImages = [
    { value: "", label: "No image" },
    { value: "/img/assessment-start.png", label: "Assessment Start" },
    { value: "/img/avatar.png", label: "Avatar" },
    { value: "/img/brain.png", label: "Brain Illustration" },
    { value: "/img/brain2.png", label: "Brain Illustration 2" },
    { value: "/img/brain3.png", label: "Brain Illustration 3" },
    { value: "/img/brain4.png", label: "Brain Illustration 4" },
    { value: "/img/axial-mark.svg", label: "Axial Mark" },
    { value: "/img/career-findings-header.png", label: "Career Findings Header" },
    { value: "/img/chat.png", label: "Chat" },
    { value: "/img/clarity-header.png", label: "Clarity Header" },
    { value: "/img/clarity-header.svg", label: "Clarity Header SVG" },
    { value: "/img/clouds.svg", label: "Clouds" },
    { value: "/img/home-clarity.png", label: "Home Clarity" },
    { value: "/img/home-other.png", label: "Home Other" },
    { value: "/img/home/clarity-thumb.png", label: "Home - Clarity Thumb" },
    { value: "/img/home/connections-thumb.png", label: "Home - Connections Thumb" },
    { value: "/img/home/credentials-thumb.png", label: "Home - Credentials Thumb" },
    { value: "/img/home/visibility-thumb.png", label: "Home - Visibility Thumb" },
    { value: "/img/intro/intro-connections.png", label: "Intro - Connections" },
    { value: "/img/intro/intro-profile.png", label: "Intro - Profile" },
    { value: "/img/login-thumb.png", label: "Login Thumb" },
    { value: "/img/onboarding/career-growth.png", label: "Onboarding - Career Growth" },
    { value: "/img/onboarding/finding-the-right-career.png", label: "Onboarding - Finding Right Career" },
    { value: "/img/onboarding/getting-a-job.png", label: "Onboarding - Getting a Job" },
    { value: "/img/onboarding/leadership-development.png", label: "Onboarding - Leadership Development" },
    { value: "/img/onboarding/networking-opportunities.png", label: "Onboarding - Networking" },
    { value: "/img/onboarding/personal-growth.png", label: "Onboarding - Personal Growth" },
    { value: "/img/profile-mock.png", label: "Profile Mock" },
    { value: "/img/steps/assessment/celebration.png", label: "Steps - Assessment Celebration" },
    { value: "/img/steps/careerPaths/celebration.png", label: "Steps - Career Paths Celebration" },
    { value: "/img/steps/careerStatement/celebration.png", label: "Steps - Career Statement Celebration" },
    { value: "/img/steps/careerStatement/question/1.png", label: "Steps - Career Statement Q1" },
    { value: "/img/steps/dreamJob/celebration.png", label: "Steps - Dream Job Celebration" },
    { value: "/img/steps/dreamJob/celebration-alt.png", label: "Steps - Dream Job Celebration Alt" },
    { value: "/img/steps/financialNeeds/celebration.png", label: "Steps - Financial Needs Celebration" },
    { value: "/img/steps/financialNeeds/question/1.png", label: "Steps - Financial Needs Q1" },
    { value: "/img/steps/financialNeeds/question/2.png", label: "Steps - Financial Needs Q2" },
    { value: "/img/steps/financialNeeds/question/3.png", label: "Steps - Financial Needs Q3" },
    { value: "/img/steps/financialNeeds/question/4.png", label: "Steps - Financial Needs Q4" },
    { value: "/img/steps/financialNeeds/question/5.png", label: "Steps - Financial Needs Q5" },
    { value: "/img/steps/financialNeeds/question/6.png", label: "Steps - Financial Needs Q6" },
    { value: "/img/steps/financialNeeds/question/7.png", label: "Steps - Financial Needs Q7" },
    { value: "/img/steps/financialNeeds/question/8.png", label: "Steps - Financial Needs Q8" },
    { value: "/img/steps/inspirations/celebration.png", label: "Steps - Inspirations Celebration" },
    { value: "/img/steps/inspirations/question/1.png", label: "Steps - Inspirations Q1" },
    { value: "/img/steps/inspirations/question/2.png", label: "Steps - Inspirations Q2" },
    { value: "/img/steps/inspirations/question/3.png", label: "Steps - Inspirations Q3" },
    { value: "/img/steps/inspirations/question/4.png", label: "Steps - Inspirations Q4" },
    { value: "/img/steps/inspirations/question/5.png", label: "Steps - Inspirations Q5" },
    { value: "/img/steps/inspirations/question/6.png", label: "Steps - Inspirations Q6" },
    { value: "/img/steps/livingEnvironment/celebration.png", label: "Steps - Living Environment Celebration" },
    { value: "/img/steps/livingEnvironment/question/1.png", label: "Steps - Living Environment Q1" },
    { value: "/img/steps/livingEnvironment/question/2.png", label: "Steps - Living Environment Q2" },
    { value: "/img/steps/livingEnvironment/question/3.png", label: "Steps - Living Environment Q3" },
    { value: "/img/steps/livingEnvironment/question/4.png", label: "Steps - Living Environment Q4" },
    { value: "/img/steps/livingEnvironment/question/5.png", label: "Steps - Living Environment Q5" },
    { value: "/img/steps/livingEnvironment/question/6.png", label: "Steps - Living Environment Q6" },
    { value: "/img/steps/strengths/celebration.png", label: "Steps - Strengths Celebration" },
    { value: "/img/steps/strengths/question/1.png", label: "Steps - Strengths Q1" },
    { value: "/img/steps/strengths/question/2.png", label: "Steps - Strengths Q2" },
    { value: "/img/steps/strengths/question/3.png", label: "Steps - Strengths Q3" },
    { value: "/img/steps/strengths/question/4.png", label: "Steps - Strengths Q4" },
    { value: "/img/steps/strengths/question/5.png", label: "Steps - Strengths Q5" },
    { value: "/img/steps/strengths/question/6.png", label: "Steps - Strengths Q6" },
    { value: "/img/steps/values/celebration.png", label: "Steps - Values Celebration" },
    { value: "/img/steps/values/question/1.png", label: "Steps - Values Q1" },
    { value: "/img/steps/values/question/2.png", label: "Steps - Values Q2" },
    { value: "/img/steps/values/question/3.png", label: "Steps - Values Q3" },
    { value: "/img/steps/values/question/4.png", label: "Steps - Values Q4" },
    { value: "/img/steps/values/question/5.png", label: "Steps - Values Q5" },
    { value: "/img/steps/values/question/6.png", label: "Steps - Values Q6" },
    { value: "/img/steps/workEnvironment/celebration.png", label: "Steps - Work Environment Celebration" },
    { value: "/img/steps/workEnvironment/question/1.png", label: "Steps - Work Environment Q1" },
    { value: "/img/steps/workEnvironment/question/2.png", label: "Steps - Work Environment Q2" },
    { value: "/img/steps/workEnvironment/question/3.png", label: "Steps - Work Environment Q3" },
    { value: "/img/steps/workEnvironment/question/4.png", label: "Steps - Work Environment Q4" },
    { value: "/img/steps/workEnvironment/question/5.png", label: "Steps - Work Environment Q5" },
    { value: "/img/steps/workEnvironment/question/6.png", label: "Steps - Work Environment Q6" },
  ];

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
              option.text?.toLowerCase().includes(lowerQuery)
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
        banner: { text: "New Banner", type: "default" },
        question: { text: "", options: [], suggestions: [] }
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

  // Load default state on mount
  useEffect(() => {
    // Load nodes and edges
    setNodes(defaultState.nodes);
    setEdges(defaultState.edges);
    
    // Load components
    const componentMap = new Map<string, ComponentData>();
    Object.entries(defaultState.components).forEach(([key, component]) => {
      componentMap.set(key, component as any);
    });
    setComponents(componentMap);
    
    // Dispatch events to update conversation preview
    defaultState.messages.forEach((message: any) => {
      const event = new CustomEvent("addMessage", {
        detail: { 
          messageId: message.messageId,
          componentId: message.componentId,
          uiToolType: message.uiToolType,
          showDropdown: false 
        },
      });
      window.dispatchEvent(event);
      
      // Dispatch component data
      const component = componentMap.get(message.componentId);
      if (component) {
        const componentDataEvent = new CustomEvent("updateComponentData", {
          detail: { 
            messageId: message.messageId, 
            componentData: component 
          },
        });
        window.dispatchEvent(componentDataEvent);
      }
    });
  }, []);

  // Sync order whenever nodes or edges change
  useEffect(() => {
    syncOrderToPreview();
  }, [nodes, edges, syncOrderToPreview]);

  // Search nodes when query changes
  useEffect(() => {
    searchNodes(searchQuery);
  }, [searchQuery, searchNodes]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.image-dropdown-container')) {
        setImageDropdownOpen(false);
      }
      if (!target.closest('.ui-tool-type-dropdown-container')) {
        setUiToolTypeDropdownOpen(false);
      }
    };

    if (imageDropdownOpen || uiToolTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [imageDropdownOpen, uiToolTypeDropdownOpen]);

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
      
      // Store the original component data for potential cancellation
      const node = nodes.find(n => n.data.messageId === messageId);
      if (node) {
        const component = components.get(node.data.componentId);
        if (component) {
          setOriginalComponentData(JSON.parse(JSON.stringify(component))); // Deep copy
        }
      }
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
        style={{}}
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
        {(() => {
          let content = "";
          let displayText = "";
          
          switch (component.uiToolType) {
            
            case "question":
              content = component.content.question?.text || "New Question";
              break;
            case "message":
              content = component.content.message?.text || "New Message";
              break;
            case "form":
              const formFields = component.content.form?.fields || [];
              content = formFields.length > 0 ? `${formFields.length} field${formFields.length === 1 ? '' : 's'}` : "Form Component";
              break;
            case "freeChat":
              content = component.content.freeChat?.text || "Free Chat";
              break;
            case "accordion":
              content = component.content.accordion?.title || "Accordion";
              break;
            case "intro":
              content = component.content.intro?.text || "Intro";
              break;
            case "multiSelect":
              content = component.content.multiSelect?.text || "Multi Select";
              break;
            default:
              content = "Component";
          }
          
          displayText = content.length > 50 ? content.substring(0, 50) + "..." : content;
          
          return (
          <div className="card-node__desc" style={{
            fontSize: "12px",
            color: "#FFF",
            marginTop: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "200px"
          }}>
              {displayText}
          </div>
          );
        })()}
        {component.uiToolType && (
          <div className="card-node__tool-type" style={{ 
            marginTop: "8px", 
            fontSize: "11px", 
            color: "#F16B68", 
            fontWeight: "600",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            {component.uiToolType}
            {component.aiGenerated && (
              <span style={{
                fontSize: "12px",
                color: "#FFD700",
                filter: "drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))"
              }}>
                ⭐
              </span>
            )}
            {/* Check if component has branch routing logic */}
            {(() => {
              // Check for branch routing in form content
              const hasFormBranchRouting = component.content.form && 
                (component.content as any).branchRouting && 
                Object.keys((component.content as any).branchRouting).length > 0;
              
              // Check for branch routing in multiSelect content
              const hasMultiSelectBranchRouting = component.content.multiSelect && 
                (component.content as any).branchRouting && 
                Object.keys((component.content as any).branchRouting).length > 0;
              
              return hasFormBranchRouting || hasMultiSelectBranchRouting;
                         })() && (
               <span style={{
                 fontSize: "12px",
                 color: "#FA8072",
                 marginLeft: "4px",
                 transform: "scale(1.5)",
                 display: "inline-block",
                 lineHeight: "1"
               }}>
                 ⎇
               </span>
             )}
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
          style={{ outline: "none" }}
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
        snapGrid={[480, 60]}
        minZoom={zoomLimits.minZoom}
        maxZoom={zoomLimits.maxZoom}
        className={searchQuery ? "searching" : ""}
        onPaneClick={() => {
          // Don't clear selection when in test mode or when exiting test mode
          if (isTestMode) return;
          
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
      
      {/* Top Navigation Bar */}
      <div style={{
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "60px",
        background: "#F8F6F3",
        borderBottom: "1px solid #E9DDD3",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: "20px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}>
        {/* Branch Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "2px",
            fontWeight: "500",
          }}>
            Branch
          </div>
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E9DDD3",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="main">main</option>
            <option value="staging">staging</option>
            <option value="dev">dev</option>
            <option value="prompt-dev">prompt-dev</option>
          </select>
        </div>

        {/* Track Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "2px",
            fontWeight: "500",
          }}>
            Track
          </div>
          <select 
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E9DDD3",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="clarity">Clarity</option>
            <option value="connections">Connections</option>
            <option value="visibility">Visibility</option>
            <option value="credentials">Credentials</option>
          </select>
        </div>

        {/* Segment Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "2px",
            fontWeight: "500",
          }}>
            Segment
          </div>
          <select 
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E9DDD3",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all-ai-generated">All AI-Generated</option>
            <option value="student">Student</option>
            <option value="graduate">Graduate</option>
            <option value="mid-career">Mid Career</option>
          </select>
        </div>

        {/* Mock Dataset Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "2px",
            fontWeight: "500",
          }}>
            Mock Dataset
          </div>
          <select 
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E9DDD3",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "200px",
            }}
          >
            {mockUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.age}) - {user.description}
              </option>
            ))}
          </select>
        </div>

        {/* Spacer to push buttons to the right */}
        <div style={{ flex: 1 }}></div>
        
        {/* Images Button - Right justified */}
        <button
          onClick={() => setShowImagesPopup(true)}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            background: "#F16B68",
            cursor: "pointer",
            outline: "none",
            color: "white",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = "0 0 0 2px rgba(241, 107, 104, 0.3)";
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
          }}
        >
          Images
        </button>

        {/* Add Component Button - Right justified, farthest to the right */}
        <button 
          className="add-component-btn"
          onClick={addNewComponent}
          style={{
            background: "#F16B68",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
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
      </div>

      {/* Copy State Button - Bottom Left */}
      <div style={{
        position: "absolute",
        bottom: "13px",
        left: "49px",
        zIndex: 10,
      }}>
        <button 
          className="copy-default-btn"
          onClick={() => {
            // Convert current screen state to the same format as localStorage
            const componentsObject: Record<string, any> = {};
            components.forEach((component, key) => {
              componentsObject[key] = component as any;
            });

            // Get current messages from conversation preview
            const getCurrentMessages = () => {
              return new Promise<any[]>((resolve) => {
                const event = new CustomEvent("getCurrentMessages", {
                  detail: { callback: resolve },
                });
                window.dispatchEvent(event);
              });
            };

            // Get messages and then copy state
            getCurrentMessages().then(messages => {
              // Clean up nodes - remove measured property
              const cleanNodes = nodes.map(node => ({
                id: node.id,
                type: node.type,
                position: node.position,
                data: node.data
              }));

              // Clean up components - only include active tool type content and banner add-on
              const cleanComponents: Record<string, any> = {};
              components.forEach((component, key) => {
                                      const cleanComponent = {
                        id: component.id,
                        name: component.name,
                        slug: component.slug,
                        uiToolType: component.uiToolType,
                        content: {
                          [component.uiToolType]: component.content[component.uiToolType]
                        },
                        aiGenerated: component.aiGenerated,
                        createdAt: component.createdAt,
                        updatedAt: component.updatedAt
                      };
                
                // Add banner data if it exists
                if (component.content.banner?.text) {
                  cleanComponent.content.banner = component.content.banner;
                }
                
                // Add text data if it exists
                if ((component.content as any).text?.text) {
                  cleanComponent.content.text = (component.content as any).text;
                }
                
                cleanComponents[key] = cleanComponent;
              });

              // Clean up messages - remove extra fields
              const cleanMessages = (messages || []).map(message => {
                const cleanMessage: any = {
                  id: message.id,
                  sender: message.sender,
                  content: message.content,
                  messageId: message.messageId,
                  componentId: message.componentId,
                  uiToolType: message.uiToolType,
                };
                
                // Only add fields that have actual content
                if (message.suggestions && message.suggestions.length > 0) {
                  cleanMessage.suggestions = message.suggestions;
                }
                if (message.image) {
                  cleanMessage.image = message.image;
                }
                if (message.multiSelectOptions && message.multiSelectOptions.length > 0) {
                  cleanMessage.multiSelectOptions = message.multiSelectOptions;
                }
                if (message.maxSelection) {
                  cleanMessage.maxSelection = message.maxSelection;
                }
                
                return cleanMessage;
              });

              const currentState = {
                nodes: cleanNodes,
                edges,
                components: cleanComponents,
                messages: cleanMessages,
                orphanMessageIds: [],
                lastSaved: new Date().toISOString(),
              };

              const jsonString = JSON.stringify(currentState, null, 2);
              navigator.clipboard.writeText(jsonString).then(() => {
                alert('Current screen state copied to clipboard!');
              });
            });
          }}
          style={{
            background: "#9CAF88", // Sage green
            color: "white", // White text
            border: "none",
            borderRadius: "6px", // Reduced from 8px
            padding: "9px 15px", // Reduced from 12px 20px (75% of original)
            fontSize: "10.5px", // Reduced from 14px (75% of original)
            fontWeight: "500",
            cursor: "pointer",
            boxShadow: "0 1.5px 6px rgba(0, 0, 0, 0.1)", // Reduced shadow
            outline: "none",
            opacity: "0.8", // Additional gray out effect
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = "0 0 0 1.5px rgba(156, 175, 136, 0.3)"; // Sage green focus
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "0 1.5px 6px rgba(0, 0, 0, 0.1)";
          }}
        >
          Copy State
        </button>
      </div>

      {/* Clear Canvas Button - Bottom Left, next to Copy State */}
      <div style={{
        position: "absolute",
        bottom: "13px",
        left: "140px", // Positioned to the right of Copy State button
        zIndex: 10,
      }}>
        <button 
          className="clear-canvas-btn"
          onClick={() => {
            if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
              // Clear all nodes, edges, and components
              setNodes([]);
              setEdges([]);
              setComponents(new Map());
              
              // Clear messages in conversation preview
              const event = new CustomEvent("clearAllMessages");
              window.dispatchEvent(event);
              
              alert('Canvas cleared successfully!');
            }
          }}
          style={{
            background: "#FA8072", // Salmon color
            color: "white", // White text
            border: "none",
            borderRadius: "6px", // Same as Copy State button
            padding: "9px 15px", // Same as Copy State button
            fontSize: "10.5px", // Same as Copy State button
            fontWeight: "500",
            cursor: "pointer",
            boxShadow: "0 1.5px 6px rgba(0, 0, 0, 0.1)", // Same shadow
            outline: "none",
            opacity: "0.8", // Same opacity
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = "0 0 0 1.5px rgba(250, 128, 114, 0.3)"; // Salmon focus
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "0 1.5px 6px rgba(0, 0, 0, 0.1)";
          }}
        >
          Clear Canvas
        </button>
      </div>

      {/* Search Bar - Moved below nav bar */}
      <div style={{
        position: "absolute",
        top: "80px",
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
              outline: "none",
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
                  outline: "none",
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
                  outline: "none",
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
                  
                  // Store the original component data for potential cancellation
                  const node = nodes.find(n => n.data.messageId === contextMenu.rightClickedMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      setOriginalComponentData(JSON.parse(JSON.stringify(component))); // Deep copy
                      // Initialize all add-on states based on existing component data
                      setBannerAddOn(!!component.content.banner?.text);
                      setTextAddOn(!!(component.content as any).text?.text);
                      setBranchRoutingAddOn(!!(component.content as any).branchRouting && Object.keys((component.content as any).branchRouting).length > 0);
                      setMoveOnButtonAddOn(!!(component.content as any).moveOnButton?.text);
                      setCelebrationModalAddOn(!!(component.content as any).celebrationModal?.title);
                      setAiGenerated(!!component.aiGenerated);
                    }
                  }
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
                color: "#F16B68",
                fontWeight: "600",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                borderBottom: "1px solid #E9DDD3",
                outline: "none",
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
                fontWeight: "600",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                outline: "none",
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
          <div className="edit-window" style={{ maxWidth: "600px", alignSelf: "flex-start", marginTop: "151px", backgroundColor: "#FFF7F1" }}>
                        <div className="edit-window-header sticky-header-full-bg" style={{ position: "sticky", top: "0", backgroundColor: "#FFF7F1", zIndex: 5, marginTop: "-3px", paddingTop: "3px" }}>
              {/* X button positioned at top right of entire edit window */}
              <button
                className="close-edit-btn"
                onClick={() => {
                  setEditingMessageId(null);
                  // Dispatch event to clear highlight in preview
                  const event = new CustomEvent("editWindowClose");
                  window.dispatchEvent(event);
                }}
                style={{
                    position: "absolute",
                    top: "-18px",
                    right: "-24px",
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#003250",
                    outline: "none",
                    height: "33px",
                    width: "33px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                }}
              >
                ×
              </button>
              
              {/* Top line: Component Name + Slug (full width) */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "-28px", minWidth: 0, alignItems: "flex-end", width: "100%" }}>
                <div style={{ flex: "2 1 0", minWidth: 0 }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#003250", fontWeight: "700", fontSize: "14px" }}>Component Name:</label>
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
                      padding: "8px 12px",
                      border: "1px solid #E9DDD3",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      height: "33px",
                      boxSizing: "border-box",
                      transform: "translate(-2px, -3px)",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "2px solid #003250";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid #E9DDD3";
                    }}
                  />
                </div>
                
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#003250", fontWeight: "700", fontSize: "14px" }}>Slug:</label>
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
                      padding: "8px 12px",
                      border: "1px solid #E9DDD3",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      height: "33px",
                      boxSizing: "border-box",
                      transform: "translate(-2px, -3px)",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "2px solid #003250";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid #E9DDD3";
                    }}
                  />
                </div>
                </div>
              </div>
              
            {/* Primary UI Tool Type dropdown - separate from header */}
                          <div className="sticky-header-full-bg sticky-header-second" style={{ position: "sticky", top: "69px", backgroundColor: "#FFF7F1", zIndex: 4, marginBottom: "27px", minWidth: 0, paddingTop: "8px", paddingBottom: "19px", borderBottom: "1px solid #E9DDD3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: "1" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#003250", fontWeight: "700", fontSize: "14px" }}>Primary UI Tool Type:</label>
                  <div className="ui-tool-type-dropdown-container" style={{ position: "relative" }}>
                <div
                  onClick={() => setUiToolTypeDropdownOpen(!uiToolTypeDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #E9DDD3",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "33px",
                    boxSizing: "border-box",
                    transform: "translate(-2px, -3px)",
                  }}
                >
                                    <span>
                    {(() => {
                      const node = nodes.find(n => n.data.messageId === editingMessageId);
                      if (!node) return "Message";
                      const component = components.get(node.data.componentId);
                      const uiToolType = component?.uiToolType || "message";
                      return uiToolTypeOptions.find(option => option.value === uiToolType)?.label || "Message";
                    })()}
                  </span>
                  <span style={{ fontSize: "18px", color: "#333", fontWeight: "600", transform: "translate(-3px, -3px)" }}>⌵</span>
                </div>
                
                {uiToolTypeDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #E9DDD3",
                      borderRadius: "8px",
                      marginTop: "4px",
                      zIndex: 1000,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                                        {uiToolTypeOptions.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => {
                          if (option.disabled) return; // Prevent selection of disabled options
                          
                          const node = nodes.find(n => n.data.messageId === editingMessageId);
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const newUiToolType = option.value as UIToolType;
                              let updatedComponent = {
                                ...component,
                                uiToolType: newUiToolType,
                                updatedAt: new Date()
                              };
                              
                              // Initialize form content if switching to form type
                              if (newUiToolType === "form" && !component.content.form) {
                                updatedComponent = {
                                  ...updatedComponent,
                                  content: {
                                    ...component.content,
                                    form: {
                                      fields: [],
                                      title: "",
                                      sendButtonText: "Continue"
                                    }
                                  }
                                };
                              }
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
                          setUiToolTypeDropdownOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          cursor: option.disabled ? "not-allowed" : "pointer",
                          borderBottom: "1px solid #f0f0f0",
                          fontSize: "14px",
                          color: option.disabled ? "#999999" : "#003250",
                          backgroundColor: option.disabled ? "#f5f5f5" : "white",
                        }}
                        onMouseEnter={(e) => {
                          if (!option.disabled) {
                            e.currentTarget.style.background = "#f5f5f5";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!option.disabled) {
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </div>
                
                {/* AI-Generated Toggle - Right Side */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: "20px",
                  marginTop: "28px"
                }}>
                  <span style={{
                    fontSize: "14px",
                    color: "#003250",
                    fontWeight: "500",
                    marginRight: "8px"
                  }}>
                    AI-Generated:
                  </span>
                  <div
                    onClick={() => {
                      setAiGenerated(!aiGenerated);
                      // TODO: Update component with AI-generated state when we add this field
                    }}
                    style={{
                      width: "36px",
                      height: "20px",
                      backgroundColor: aiGenerated ? "#87A96B" : "#E9DDD3",
                      borderRadius: "10px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      alignItems: "center",
                      padding: "2px",
                      boxShadow: aiGenerated 
                        ? "inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(135, 169, 107, 0.3)" 
                        : "inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)",
                      border: aiGenerated 
                        ? "1px solid rgba(135, 169, 107, 0.4)" 
                        : "1px solid rgba(233, 221, 211, 0.6)"
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transform: aiGenerated ? "translateX(16px)" : "translateX(0px)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: aiGenerated 
                          ? "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)" 
                          : "0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                        filter: aiGenerated ? "drop-shadow(0 1px 2px rgba(135, 169, 107, 0.3))" : "none"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Third Row: Add Ons */}
            <div style={{ 
              position: "sticky", 
              top: "120px", 
              backgroundColor: "#F2E8E0", 
              border: "1px solid #E9DDD3",
              zIndex: 3, 
              marginBottom: "0px", 
              paddingTop: "40px", 
              paddingBottom: "20px", 
              paddingLeft: "20px",
              paddingRight: "20px",
              marginLeft: "-20px",
              marginRight: "-20px",
              display: "flex",
              alignItems: "center",
              gap: "16px"
            }}>
              <span style={{
                fontSize: "14px",
                color: "#003250",
                fontWeight: "700",
                whiteSpace: "nowrap"
              }}>
                Add Ons:
              </span>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px"
              }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  color: "#003250",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={bannerAddOn}
                    onChange={(e) => {
                      setBannerAddOn(e.target.checked);
                      
                      // Update preview immediately when checkbox changes
                      const node = nodes.find(n => n.data.messageId === editingMessageId);
                      if (node) {
                        const component = components.get(node.data.componentId);
                        if (component) {
                          const updatedComponent = {
                            ...component,
                            content: {
                              ...component.content,
                              banner: e.target.checked ? {
                                text: component.content.banner?.text || "",
                                type: "default"
                              } : undefined
                            }
                          };
                          
                          // Dispatch event to update component data immediately
                          const componentEvent = new CustomEvent("updateComponentData", {
                            detail: { 
                              messageId: editingMessageId, 
                              componentData: updatedComponent
                            },
                          });
                          window.dispatchEvent(componentEvent);
                        }
                      }
                    }}
                    style={{
                      accentColor: "#003250",
                      transform: "scale(1.1)"
                    }}
                  />
                  Banner
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  color: "#003250",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={textAddOn}
                    onChange={(e) => {
                      setTextAddOn(e.target.checked);
                      
                      // Update preview immediately when checkbox changes
                      const node = nodes.find(n => n.data.messageId === editingMessageId);
                      if (node) {
                        const component = components.get(node.data.componentId);
                        if (component) {
                          const updatedComponent = {
                            ...component,
                            content: {
                              ...component.content,
                              text: e.target.checked ? {
                                text: (component.content as any).text?.text || "",
                                type: "default",
                                millisecondsToLoad: (component.content as any).text?.millisecondsToLoad || 0
                              } : undefined
                            }
                          };
                          
                          // Dispatch event to update component data immediately
                          const componentEvent = new CustomEvent("updateComponentData", {
                            detail: { 
                              messageId: editingMessageId, 
                              componentData: updatedComponent
                            },
                          });
                          window.dispatchEvent(componentEvent);
                        }
                      }
                    }}
                    style={{
                      accentColor: "#003250",
                      transform: "scale(1.1)"
                    }}
                  />
                  Text
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  color: "#003250",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={branchRoutingAddOn}
                    onChange={(e) => setBranchRoutingAddOn(e.target.checked)}
                    style={{
                      accentColor: "#003250",
                      transform: "scale(1.1)"
                    }}
                  />
                  Branch Routing Logic
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  color: "#003250",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={moveOnButtonAddOn}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setMoveOnButtonAddOn(newValue);
                      
                      // Update component data immediately for real-time preview
                      if (editingMessageId) {
                        const node = nodes.find(n => n.data.messageId === editingMessageId);
                        if (node) {
                          const component = components.get(node.data.componentId);
                          if (component) {
                            const updatedComponent = {
                              ...component,
                              content: {
                                ...component.content,
                                moveOnButton: newValue ? {
                                  text: (component.content as any).moveOnButton?.text || ""
                                } : undefined
                              },
                              updatedAt: new Date()
                            };
                            
                            // Dispatch event to update preview immediately
                            const event = new CustomEvent("updateComponentData", {
                              detail: { 
                                messageId: editingMessageId, 
                                componentData: updatedComponent 
                              },
                            });
                            window.dispatchEvent(event);
                          }
                        }
                      }
                    }}
                    style={{
                      accentColor: "#003250",
                      transform: "scale(1.1)"
                    }}
                  />
                  Move On Button
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  color: "#003250",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={celebrationModalAddOn}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setCelebrationModalAddOn(newValue);
                      
                      // Update component data immediately for real-time preview
                      if (editingMessageId) {
                        const node = nodes.find(n => n.data.messageId === editingMessageId);
                        if (node) {
                          const component = components.get(node.data.componentId);
                          if (component) {
                            const updatedComponent = {
                              ...component,
                              content: {
                                ...component.content,
                                celebrationModal: newValue ? {
                                  title: (component.content as any).celebrationModal?.title || "",
                                  content: (component.content as any).celebrationModal?.content || "",
                                  description: (component.content as any).celebrationModal?.description || "",
                                  media: (component.content as any).celebrationModal?.media || "",
                                  callToActionText: (component.content as any).celebrationModal?.callToActionText || "",
                                  timeToLoad: (component.content as any).celebrationModal?.timeToLoad || 0
                                } : undefined
                              },
                              updatedAt: new Date()
                            };
                            
                            // Dispatch event to update preview immediately
                            const event = new CustomEvent("updateComponentData", {
                              detail: { 
                                messageId: editingMessageId, 
                                componentData: updatedComponent 
                              },
                            });
                            window.dispatchEvent(event);
                          }
                        }
                      }
                    }}
                    style={{
                      accentColor: "#003250",
                      transform: "scale(1.1)"
                    }}
                  />
                  Celebration Modal
                </label>
              </div>
            </div>
            
            <div className="edit-window-content" style={{ width: "100%", paddingTop: (bannerAddOn || textAddOn) ? "0px" : "20px" }}>
              
              {(() => {
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                if (!node) return null;
                  const component = components.get(node.data.componentId);
                const uiToolType = component?.uiToolType || "message";
                
                // Show "Coming Soon" screen when AI-generated is toggled on
                if (aiGenerated) {
                  return (
                    <>
                      {/* Show banner and text fields above the Coming Soon window if they're checked */}
                      {bannerAddOn && (
                        <>
                          <label style={{ fontWeight: "700" }}>Banner Title:</label>
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
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginBottom: "16px",
                              height: "33px",
                              boxSizing: "border-box",
                              transform: "translate(-2px, -3px)",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </>
                      )}
                      
                      {textAddOn && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <label style={{ fontWeight: "700" }}>Text Content:</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <label style={{ fontWeight: "700", fontSize: "14px" }}>Milliseconds to Load:</label>
                              <input
                                type="number"
                                value={(component?.content as any)?.text?.millisecondsToLoad || 0}
                                onChange={(e) => {
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          text: {
                                            ...(component.content as any).text,
                                            millisecondsToLoad: parseInt(e.target.value) || 0
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
                                style={{
                                  width: "80px",
                                  padding: "4px 8px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                  textAlign: "right"
                                }}
                                min="0"
                                step="100"
                              />
                            </div>
                          </div>
                          <textarea
                            value={(component?.content as any)?.text?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      text: {
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
                            placeholder="Enter your text content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginBottom: "6px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              transform: "translate(-2px, -3px)",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </>
                      )}
                      
                      {/* AI-Generated Prompt Input */}
                      <div style={{
                        minHeight: "300px",
                        backgroundColor: "#f8f8f8",
                        borderRadius: "8px",
                        border: "2px dashed #ccc",
                        margin: "20px 0",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <label style={{ fontWeight: "700" }}>Prompt:</label>
                          <div style={{ position: "relative" }}>
                            <select
                              value={component?.content.aiPrompt?.llm || "gpt-4o"}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        aiPrompt: {
                                          ...component.content.aiPrompt,
                                          llm: e.target.value
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
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="gpt-4o">GPT-4o</option>
                              <option value="gpt-4o-mini">GPT-4o Mini</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                              <option value="claude-3-opus">Claude 3 Opus</option>
                              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                              <option value="claude-3-haiku">Claude 3 Haiku</option>
                              <option value="gemini-pro">Gemini Pro</option>
                              <option value="gemini-flash">Gemini Flash</option>
                              <option value="llama-3.1-8b">Llama 3.1 8B</option>
                              <option value="llama-3.1-70b">Llama 3.1 70B</option>
                              <option value="mistral-large">Mistral Large</option>
                              <option value="mistral-medium">Mistral Medium</option>
                              <option value="mixtral-8x7b">Mixtral 8x7B</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          value={component?.content.aiPrompt?.text || ""}
                          onChange={(e) => {
                            if (node) {
                              const component = components.get(node.data.componentId);
                              if (component) {
                                const updatedComponent = {
                                  ...component,
                                  content: {
                                    ...component.content,
                                    aiPrompt: {
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
                          placeholder="Enter your AI prompt here..."
                          style={{
                            width: "100%",
                            flex: 1,
                            minHeight: "250px",
                            padding: "12px",
                            border: "1px solid #E9DDD3",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            resize: "vertical",
                            boxSizing: "border-box",
                            background: "white",
                            outline: "none"
                          }}
                          onFocus={(e) => {
                            e.target.style.border = "2px solid #003250";
                          }}
                          onBlur={(e) => {
                            e.target.style.border = "1px solid #E9DDD3";
                          }}
                        />
                      </div>
                      
                      {/* Move On Button Section - only show when checked */}
                      {moveOnButtonAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Move On Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.moveOnButton?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      moveOnButton: {
                                        text: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter button text (e.g., 'Continue', 'Next', 'Submit')..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Celebration Modal Section - only show when checked */}
                      {celebrationModalAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Title:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.title || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        title: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal title..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Content:</label>
                          <textarea
                            value={(component?.content as any)?.celebrationModal?.content || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        content: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginTop: "8px",
                              marginBottom: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Description:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.description || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        description: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal description..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Media:</label>
                          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
                            <select
                              value={(component?.content as any)?.celebrationModal?.media || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        celebrationModal: {
                                          ...(component.content as any).celebrationModal,
                                          media: e.target.value
                                        }
                                      },
                                      updatedAt: new Date()
                                    };
                                    setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                    
                                    // Dispatch event to update component data
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
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="">Select an image...</option>
                              {availableImages.map((image, index) => (
                                <option key={index} value={image.value}>
                                  {image.label}
                                </option>
                              ))}
                            </select>
                            {(component?.content as any)?.celebrationModal?.media && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                padding: "8px",
                                marginTop: "4px",
                                zIndex: 10,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                <img
                                  src={(component?.content as any)?.celebrationModal?.media}
                                  alt="Selected"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "100px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <label style={{ fontWeight: "700" }}>Call to Action Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.callToActionText || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        callToActionText: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter call to action button text..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Time to Load (milliseconds):</label>
                          <input
                            type="number"
                            min="0"
                            value={(component?.content as any)?.celebrationModal?.timeToLoad || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        timeToLoad: parseInt(e.target.value) || 0
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter time to load in milliseconds..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                }
                
                // Banner add-on field
                const bannerField = bannerAddOn && (
                  <div style={{
                    backgroundColor: aiGenerated ? "#F2E8E0" : "#F2E8E0",
                    padding: "16px",
                    marginBottom: "0px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    paddingLeft: "20px",
                    paddingRight: "20px"
                  }}>
                    <label style={{ fontWeight: "700" }}>Banner Title:</label>
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
                          padding: "8px 12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          height: "33px",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          background: "white",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                  </div>
                );

                // Text add-on field
                const textField = textAddOn && (
                  <div style={{
                    backgroundColor: aiGenerated ? "#F2E8E0" : "#F2E8E0",
                    padding: "16px",
                    marginBottom: "0px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    paddingLeft: "20px",
                    paddingRight: "20px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ fontWeight: "700" }}>Text Content:</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontWeight: "700", fontSize: "14px" }}>Milliseconds to Load:</label>
                        <input
                          type="number"
                          value={(component?.content as any)?.text?.millisecondsToLoad || 0}
                          onChange={(e) => {
                            if (node) {
                              const component = components.get(node.data.componentId);
                              if (component) {
                                const updatedComponent = {
                                  ...component,
                                  content: {
                                    ...component.content,
                                    text: {
                                      ...(component.content as any).text,
                                      millisecondsToLoad: parseInt(e.target.value) || 0
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
                          style={{
                            width: "80px",
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "14px",
                            textAlign: "right"
                          }}
                          min="0"
                          step="100"
                        />
                      </div>
                    </div>
                    <textarea
                      value={(component?.content as any)?.text?.text || ""}
                      onChange={(e) => {
                        if (node) {
                          const component = components.get(node.data.componentId);
                          if (component) {
                            const updatedComponent = {
                              ...component,
                              content: {
                                ...component.content,
                                text: {
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
                      placeholder="Enter your text content..."
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "12px",
                        border: "1px solid #E9DDD3",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        marginBottom: "6px",
                        resize: "vertical",
                        boxSizing: "border-box",
                        transform: "translate(-2px, -3px)",
                        outline: "none"
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "2px solid #003250";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid #E9DDD3";
                      }}
                    />
                  </div>
                );
                
                if (uiToolType === "question") {
                  return (
                    <>
                      {bannerField}
                      {textField}
                      {(bannerAddOn || textAddOn) && (
                        <div style={{
                          borderBottom: "1px solid #E9DDD3",
                          marginBottom: "0px",
                          paddingBottom: "4px"
                        }} />
                      )}
                      <label style={{ fontWeight: "700" }}>Question Text:</label>
                      <textarea
                        value={component?.content.question?.text || ""}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  question: {
                                    ...component.content.question,
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
                        placeholder="Enter your question text (supports Markdown)..."
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          padding: "12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          resize: "vertical",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                      
                      <label style={{ fontWeight: "700" }}>Image:</label>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
                        <div className="image-dropdown-container" style={{ flex: 1, position: "relative" }}>
                          <div
                            onClick={() => setImageDropdownOpen(imageDropdownOpen ? false : "question")}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              height: "33px",
                              boxSizing: "border-box",
                              transform: "translate(-2px, -3px)",
                            }}
                          >
                            <span>
                              {availableImages.find(img => img.value === component?.content.question?.image)?.label || "No image"}
                            </span>
                            <span style={{ fontSize: "18px", color: "#333", fontWeight: "600", transform: "translateY(-3px)" }}>⌵</span>
                          </div>
                          
                          {imageDropdownOpen === "question" && (
                            <div
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                background: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                marginTop: "4px",
                                maxHeight: "200px",
                                overflowY: "auto",
                                zIndex: 1000,
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                              }}
                            >
                              {availableImages.map((image) => (
                                <div
                                  key={image.value}
                                  onClick={() => {
                                    // Remove any existing popups
                                    const existingPopups = document.querySelectorAll('[data-image-preview]');
                                    existingPopups.forEach(popup => popup.remove());
                                    
                                    if (node) {
                                      const component = components.get(node.data.componentId);
                                      if (component) {
                                        const updatedComponent = {
                                          ...component,
                                          content: {
                                            ...component.content,
                                            question: {
                                              ...component.content.question,
                                              image: image.value
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
                                    setImageDropdownOpen(false);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#f5f5f5";
                                    if (image.value) {
                                      const popup = document.createElement('div');
                                      popup.setAttribute('data-image-preview', 'true');
                                      popup.style.cssText = `
                                        position: fixed;
                                        top: ${e.clientY + 10}px;
                                        left: ${e.clientX + 10}px;
                                        z-index: 10001;
                                        background: white;
                                        border: 1px solid #E9DDD3;
                                        border-radius: 8px;
                                        padding: 8px;
                                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                        max-width: 200px;
                                        max-height: 200px;
                                      `;
                                      popup.innerHTML = `<img src="${image.value}" style="width: 100%; height: 100%; object-fit: contain;" alt="Preview" />`;
                                      document.body.appendChild(popup);
                                      e.currentTarget.addEventListener('mouseleave', () => {
                                        if (popup.parentNode) {
                                          popup.parentNode.removeChild(popup);
                                        }
                                      }, { once: true });
                                    }
                                  }}
                                  style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f0f0f0",
                                    fontSize: "14px",
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "white";
                                  }}
                                >
                                  {image.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Thumbnail Preview */}
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            border: "1px solid #E9DDD3",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: component?.content.question?.image ? "white" : "#f5f5f5",
                            position: "relative",
                            cursor: component?.content.question?.image ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) => {
                            if (component?.content.question?.image) {
                              const popup = document.createElement('div');
                              popup.setAttribute('data-image-preview', 'true');
                              popup.style.cssText = `
                                position: fixed;
                                top: ${e.clientY + 10}px;
                                left: ${e.clientX + 10}px;
                                z-index: 10000;
                                background: white;
                                border: 1px solid #E9DDD3;
                                border-radius: 8px;
                                padding: 8px;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                max-width: 200px;
                                max-height: 200px;
                              `;
                              popup.innerHTML = `<img src="${component.content.question.image}" style="width: 100%; height: 100%; object-fit: contain;" alt="Preview" />`;
                              document.body.appendChild(popup);
                              e.currentTarget.setAttribute('data-popup', 'true');
                              e.currentTarget.addEventListener('mouseleave', () => {
                                if (popup.parentNode) {
                                  popup.parentNode.removeChild(popup);
                                }
                              }, { once: true });
                            }
                          }}
                        >
                          {component?.content.question?.image ? (
                            <img
                              src={component.content.question.image}
                              alt="Selected"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "6px",
                              }}
                            />
                          ) : (
                            <span style={{ color: "#999", fontSize: "12px" }}>No img</span>
                          )}
                        </div>
                      </div>
                      
                      <label style={{ fontWeight: "700" }}>Suggested Responses:</label>
                      <div style={{ marginBottom: "16px" }}>
                        {(component?.content.question?.suggestions || [""]).map((suggestion, index) => (
                          <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              value={suggestion}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                                    const currentSuggestions = component.content.question?.suggestions || [""];
                                    const newSuggestions = [...currentSuggestions];
                                    newSuggestions[index] = e.target.value;
                                    
                                    // Remove empty suggestions except the last one
                                    const filteredSuggestions = newSuggestions.filter((s, i) => 
                                      s.trim() !== "" || i === newSuggestions.length - 1
                                    );
                                    
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  question: {
                                    ...component.content.question,
                                          suggestions: filteredSuggestions
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const currentSuggestions = component.content.question?.suggestions || [""];
                                      const newSuggestions = [...currentSuggestions, ""];
                                      
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          question: {
                                            ...component.content.question,
                                            suggestions: newSuggestions
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
                                }
                              }}
                              placeholder={`Suggestion ${index + 1}`}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                                outline: "none"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            />
                            {(component?.content.question?.suggestions?.length || 1) > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const currentSuggestions = component.content.question?.suggestions || [""];
                                      const newSuggestions = currentSuggestions.filter((_, i) => i !== index);
                                      
                                      // Ensure we always have at least one suggestion field
                                      if (newSuggestions.length === 0) {
                                        newSuggestions.push("");
                                      }
                                      
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          question: {
                                            ...component.content.question,
                                            suggestions: newSuggestions
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
                                style={{
                                  background: "#F16B68",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  outline: "none",
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            if (node) {
                              const component = components.get(node.data.componentId);
                              if (component) {
                                const currentSuggestions = component.content.question?.suggestions || [""];
                                const newSuggestions = [...currentSuggestions, ""];
                                
                                const updatedComponent = {
                                  ...component,
                                  content: {
                                    ...component.content,
                                    question: {
                                      ...component.content.question,
                                      suggestions: newSuggestions
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
                          style={{
                            background: "#8EAF86",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            marginTop: "4px",
                            outline: "none",
                          }}
                        >
                          + Add Suggestion
                        </button>
                      </div>
                      
                      {/* Move On Button Section - only show when checked */}
                      {moveOnButtonAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Move On Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.moveOnButton?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      moveOnButton: {
                                        text: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter button text (e.g., 'Continue', 'Next', 'Submit')..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Celebration Modal Section - only show when checked */}
                      {celebrationModalAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Title:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.title || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        title: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal title..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Content:</label>
                          <textarea
                            value={(component?.content as any)?.celebrationModal?.content || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        content: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginTop: "8px",
                              marginBottom: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Description:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.description || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        description: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal description..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Media:</label>
                          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
                            <select
                              value={(component?.content as any)?.celebrationModal?.media || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        celebrationModal: {
                                          ...(component.content as any).celebrationModal,
                                          media: e.target.value
                                        }
                                      },
                                      updatedAt: new Date()
                                    };
                                    setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                    
                                    // Dispatch event to update component data
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
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="">Select an image...</option>
                              {availableImages.map((image, index) => (
                                <option key={index} value={image.value}>
                                  {image.label}
                                </option>
                              ))}
                            </select>
                            {(component?.content as any)?.celebrationModal?.media && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                padding: "8px",
                                marginTop: "4px",
                                zIndex: 10,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                <img
                                  src={(component?.content as any)?.celebrationModal?.media}
                                  alt="Selected"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "100px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <label style={{ fontWeight: "700" }}>Call to Action Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.callToActionText || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        callToActionText: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter call to action button text..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Time to Load (milliseconds):</label>
                          <input
                            type="number"
                            min="0"
                            value={(component?.content as any)?.celebrationModal?.timeToLoad || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        timeToLoad: parseInt(e.target.value) || 0
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter time to load in milliseconds..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                } else if (uiToolType === "form") {
                  return (
                    <>
                      {bannerField}
                      {textField}
                      {(bannerAddOn || textAddOn) && (
                        <div style={{
                          borderBottom: "1px solid #E9DDD3",
                          marginBottom: "20px",
                          paddingBottom: "16px"
                        }} />
                      )}
                      
                      <label style={{ fontWeight: "700" }}>Form Title:</label>
                      <input
                        type="text"
                        value={component?.content.form?.title || ""}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  form: {
                                    ...component.content.form,
                                    fields: component.content.form?.fields || [],
                                    title: e.target.value
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
                        placeholder="Enter form title..."
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          height: "33px",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          background: "white",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                      

                      
                      <label style={{ fontWeight: "700" }}>Form Fields:</label>
                      <div style={{ marginBottom: "16px" }}>
                        {(component?.content.form?.fields || []).map((field, index) => (
                          <div key={field.id} style={{ 
                            border: "1px solid #E9DDD3", 
                            borderRadius: "8px", 
                            padding: "16px", 
                            marginBottom: "12px",
                            backgroundColor: "#fafafa"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ fontWeight: "600", color: "#003250" }}>Field {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const currentFields = component.content.form?.fields || [];
                                      const newFields = currentFields.filter((_, i) => i !== index);
                                      
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          form: {
                                            ...component.content.form,
                                            fields: newFields
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
                                style={{
                                  background: "#F16B68",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  outline: "none",
                                }}
                              >
                                ×
                              </button>
                            </div>
                            
                            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600" }}>Field Type:</label>
                                <select
                                  value={field.type}
                                  onChange={(e) => {
                                    if (node) {
                                      const component = components.get(node.data.componentId);
                                      if (component) {
                                        const currentFields = component.content.form?.fields || [];
                                        const newFields = [...currentFields];
                                        newFields[index] = { ...newFields[index], type: e.target.value as FormField['type'] };
                                        
                                        const updatedComponent = {
                                          ...component,
                                          content: {
                                            ...component.content,
                                            form: {
                                              ...component.content.form,
                                              fields: newFields
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
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    border: "1px solid #E9DDD3",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontFamily: "inherit",
                                    background: "white",
                                    outline: "none"
                                  }}
                                >
                                  <option value="text">Text</option>
                                  <option value="longText">Long Text</option>
                                  <option value="currency">Currency</option>
                                  <option value="dropdown">Dropdown</option>
                                  <option value="radio">Radio</option>
                                  <option value="checkbox">Checkbox</option>
                                </select>
                              </div>
                              
                              <div style={{ flex: 2 }}>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600" }}>Field Title:</label>
                                <input
                                  type="text"
                                  value={field.title}
                                  onChange={(e) => {
                                    if (node) {
                                      const component = components.get(node.data.componentId);
                                      if (component) {
                                        const currentFields = component.content.form?.fields || [];
                                        const newFields = [...currentFields];
                                        newFields[index] = { ...newFields[index], title: e.target.value };
                                        
                                        const updatedComponent = {
                                          ...component,
                                          content: {
                                            ...component.content,
                                            form: {
                                              ...component.content.form,
                                              fields: newFields
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
                                  placeholder="Enter field title..."
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    border: "1px solid #E9DDD3",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontFamily: "inherit",
                                    background: "white",
                                    outline: "none"
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.border = "2px solid #003250";
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.border = "1px solid #E9DDD3";
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* Options for dropdown, radio, checkbox */}
                            {(field.type === "dropdown" || field.type === "radio" || field.type === "checkbox") && (
                              <div>
                                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600" }}>Options:</label>
                                <div style={{ marginBottom: "8px" }}>
                                  {(field.options || [""]).map((option, optionIndex) => (
                                    <div key={optionIndex} style={{ display: "flex", gap: "8px", marginBottom: "4px", alignItems: "center" }}>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                          if (node) {
                                            const component = components.get(node.data.componentId);
                                            if (component) {
                                              const currentFields = component.content.form?.fields || [];
                                              const newFields = [...currentFields];
                                              const currentOptions = newFields[index].options || [""];
                                              const newOptions = [...currentOptions];
                                              newOptions[optionIndex] = e.target.value;
                                              
                                              // Remove empty options except the last one
                                              const filteredOptions = newOptions.filter((opt, i) => 
                                                opt.trim() !== "" || i === newOptions.length - 1
                                              );
                                              
                                              newFields[index] = { ...newFields[index], options: filteredOptions };
                                              
                                              const updatedComponent = {
                                                ...component,
                                                content: {
                                                  ...component.content,
                                                  form: {
                                                    ...component.content.form,
                                                    fields: newFields
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
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (node) {
                                              const component = components.get(node.data.componentId);
                                              if (component) {
                                                const currentFields = component.content.form?.fields || [];
                                                const newFields = [...currentFields];
                                                const currentOptions = newFields[index].options || [""];
                                                const newOptions = [...currentOptions, ""];
                                                
                                                newFields[index] = { ...newFields[index], options: newOptions };
                                                
                                                const updatedComponent = {
                                                  ...component,
                                                  content: {
                                                    ...component.content,
                                                    form: {
                                                      ...component.content.form,
                                                      fields: newFields
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
                                          }
                                        }}
                                        placeholder={`Option ${optionIndex + 1}`}
                                        style={{
                                          flex: 1,
                                          padding: "4px 6px",
                                          border: "1px solid #E9DDD3",
                                          borderRadius: "4px",
                                          fontSize: "11px",
                                          fontFamily: "inherit",
                                          outline: "none"
                                        }}
                                        onFocus={(e) => {
                                          e.target.style.border = "2px solid #003250";
                                        }}
                                        onBlur={(e) => {
                                          e.target.style.border = "1px solid #E9DDD3";
                                        }}
                                      />
                                      {(field.options?.length || 1) > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (node) {
                                              const component = components.get(node.data.componentId);
                                              if (component) {
                                                const currentFields = component.content.form?.fields || [];
                                                const newFields = [...currentFields];
                                                const currentOptions = newFields[index].options || [""];
                                                const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
                                                
                                                // Ensure we always have at least one option field
                                                if (newOptions.length === 0) {
                                                  newOptions.push("");
                                                }
                                                
                                                newFields[index] = { ...newFields[index], options: newOptions };
                                                
                                                const updatedComponent = {
                                                  ...component,
                                                  content: {
                                                    ...component.content,
                                                    form: {
                                                      ...component.content.form,
                                                      fields: newFields
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
                                          style={{
                                            background: "#F16B68",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "3px",
                                            width: "20px",
                                            height: "20px",
                                            fontSize: "10px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            outline: "none",
                                          }}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (node) {
                                        const component = components.get(node.data.componentId);
                                        if (component) {
                                          const currentFields = component.content.form?.fields || [];
                                          const newFields = [...currentFields];
                                          const currentOptions = newFields[index].options || [""];
                                          const newOptions = [...currentOptions, ""];
                                          
                                          newFields[index] = { ...newFields[index], options: newOptions };
                                          
                                          const updatedComponent = {
                                            ...component,
                                            content: {
                                              ...component.content,
                                              form: {
                                                ...component.content.form,
                                                fields: newFields
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
                                    style={{
                                      background: "#8EAF86",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "3px 8px",
                                      fontSize: "10px",
                                      cursor: "pointer",
                                      marginTop: "4px",
                                      outline: "none",
                                    }}
                                  >
                                    + Add Option
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            if (node) {
                              const component = components.get(node.data.componentId);
                              if (component) {
                                const currentFields = component.content.form?.fields || [];
                                const newField: FormField = {
                                  id: `field_${Date.now()}`,
                                  type: "text",
                                  title: "",
                                  required: false
                                };
                                const newFields = [...currentFields, newField];
                                
                                const updatedComponent = {
                                  ...component,
                                  content: {
                                    ...component.content,
                                    form: {
                                      ...component.content.form,
                                      fields: newFields
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
                          style={{
                            background: "#8EAF86",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            marginTop: "4px",
                            outline: "none",
                          }}
                        >
                          + Add Field
                        </button>
                      </div>
                      
                      <label style={{ fontWeight: "700" }}>Send Button Text:</label>
                      <input
                        type="text"
                        value={component?.content.form?.sendButtonText || "Continue"}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  form: {
                                    ...component.content.form,
                                    fields: component.content.form?.fields || [],
                                    sendButtonText: e.target.value
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
                        placeholder="Enter send button text..."
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          height: "33px",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          background: "white",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                      
                      {/* Branch Routing Logic Section - only show when checked */}
                      {branchRoutingAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <div style={{
                            fontSize: "14px",
                            color: "#003250",
                            fontWeight: "700",
                            marginBottom: "16px"
                          }}>
                            Branch Routing Logic
                          </div>
                          
                                                     {/* Find the last dropdown field for routing options */}
                           {(() => {
                             const formFields = component?.content.form?.fields || [];
                             const lastDropdownField = formFields.slice().reverse().find((field: FormField) => field.type === "dropdown");
                             
                             if (lastDropdownField && lastDropdownField.options) {
                               return lastDropdownField.options.map((option: string, index: number) => (
                                <div key={index} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  marginBottom: "12px"
                                }}>
                                  <span style={{
                                    fontSize: "14px",
                                    color: "#003250",
                                    minWidth: "120px"
                                  }}>
                                    When user chooses "{option}" →
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Enter component slug..."
                                    value={(component?.content as any)?.branchRouting?.[index]?.destinationSlug || ""}
                                    onChange={(e) => {
                                      if (node) {
                                        const component = components.get(node.data.componentId);
                                        if (component) {
                                          const updatedComponent = {
                                            ...component,
                                            content: {
                                              ...component.content,
                                              branchRouting: {
                                                ...(component.content as any).branchRouting,
                                                [index]: {
                                                  optionText: option,
                                                  destinationSlug: e.target.value
                                                }
                                              }
                                            },
                                            updatedAt: new Date()
                                          };
                                          setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                          
                                          // Dispatch event to update component data
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
                                    style={{
                                      flex: 1,
                                      padding: "8px 12px",
                                      border: "1px solid #E9DDD3",
                                      borderRadius: "8px",
                                      fontSize: "14px",
                                      fontFamily: "inherit",
                                      background: "white",
                                      outline: "none"
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.border = "2px solid #003250";
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.border = "1px solid #E9DDD3";
                                    }}
                                  />
                                </div>
                              ));
                            }
                            return (
                              <div style={{ color: "#666", fontSize: "12px" }}>
                                Add a dropdown field to enable branch routing logic.
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Move On Button Section - only show when checked */}
                      {moveOnButtonAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Move On Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.moveOnButton?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      moveOnButton: {
                                        text: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter button text (e.g., 'Continue', 'Next', 'Submit')..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Celebration Modal Section - only show when checked */}
                      {celebrationModalAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Title:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.title || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        title: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal title..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Content:</label>
                          <textarea
                            value={(component?.content as any)?.celebrationModal?.content || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        content: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginTop: "8px",
                              marginBottom: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Description:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.description || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        description: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal description..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Media:</label>
                          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
                            <select
                              value={(component?.content as any)?.celebrationModal?.media || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        celebrationModal: {
                                          ...(component.content as any).celebrationModal,
                                          media: e.target.value
                                        }
                                      },
                                      updatedAt: new Date()
                                    };
                                    setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                    
                                    // Dispatch event to update component data
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
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="">Select an image...</option>
                              {availableImages.map((image, index) => (
                                <option key={index} value={image.value}>
                                  {image.label}
                                </option>
                              ))}
                            </select>
                            {(component?.content as any)?.celebrationModal?.media && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                padding: "8px",
                                marginTop: "4px",
                                zIndex: 10,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                <img
                                  src={(component?.content as any)?.celebrationModal?.media}
                                  alt="Selected"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "100px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <label style={{ fontWeight: "700" }}>Call to Action Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.callToActionText || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        callToActionText: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter call to action button text..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Time to Load (milliseconds):</label>
                          <input
                            type="number"
                            min="0"
                            value={(component?.content as any)?.celebrationModal?.timeToLoad || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        timeToLoad: parseInt(e.target.value) || 0
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter time to load in milliseconds..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                } else if (uiToolType === "multiSelect") {
                  return (
                    <>
                      {bannerField}
                      {textField}
                      {(bannerAddOn || textAddOn) && (
                        <div style={{
                          borderBottom: "1px solid #E9DDD3",
                          marginBottom: "20px",
                          paddingBottom: "16px"
                        }} />
                      )}
                      <label style={{ fontWeight: "700" }}>Question Text:</label>
                      <textarea
                        value={component?.content.multiSelect?.text || ""}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  multiSelect: {
                                    ...component.content.multiSelect,
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
                        placeholder="Enter your multi-select question..."
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          padding: "12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          resize: "vertical",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                      
                      <label style={{ fontWeight: "700" }}>Max Selection:</label>
                      <input
                        type="number"
                        min="1"
                        value={component?.content.multiSelect?.maxSelection || 1}
                        onChange={(e) => {
                          if (node) {
                            const component = components.get(node.data.componentId);
                            if (component) {
                              const updatedComponent = {
                                ...component,
                                content: {
                                  ...component.content,
                                  multiSelect: {
                                    ...component.content.multiSelect,
                                    maxSelection: parseInt(e.target.value) || 1
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
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #E9DDD3",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          marginBottom: "16px",
                          height: "33px",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                        }}
                      />
                      
                      <label style={{ fontWeight: "700" }}>Options:</label>
                      <div style={{ marginBottom: "16px" }}>
                        {(component?.content.multiSelect?.options || [{ text: "" }]).map((option, index) => (
                          <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
                            <input
                              type="text"
                              value={option.text || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const currentOptions = component.content.multiSelect?.options || [{ text: "" }];
                                    const newOptions = [...currentOptions];
                                    newOptions[index] = { ...newOptions[index], text: e.target.value };
                                    
                                    // Remove empty options except the last one
                                    const filteredOptions = newOptions.filter((opt, i) => 
                                      opt.text?.trim() !== "" || i === newOptions.length - 1
                                    );
                                    
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        multiSelect: {
                                          ...component.content.multiSelect,
                                          options: filteredOptions
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
                              placeholder={`Option ${index + 1}`}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                                height: "33px",
                                minWidth: "200px",
                                transform: "translate(-2px, -3px)",
                                outline: "none"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            />
                            
                            {/* Image dropdown for this option */}
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                              <div className="image-dropdown-container" style={{ flex: 1, position: "relative", minWidth: "200px" }}>
                                <div
                                  onClick={() => {
                                    // Toggle dropdown for this specific option
                                    const dropdownKey = `imageDropdown_${index}`;
                                    setImageDropdownOpen(prev => prev === dropdownKey ? false : dropdownKey);
                                  }}
                                  style={{
                                    padding: "8px 12px",
                                    border: "1px solid #E9DDD3",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontFamily: "inherit",
                                    background: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    height: "33px",
                                    boxSizing: "border-box",
                                    minWidth: "200px",
                                    width: "200px",
                                    transform: "translate(-2px, -3px)",
                                  }}
                                >
                                  <span style={{ 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis", 
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                    marginRight: "3px"
                                  }}>
                                    {availableImages.find(img => img.value === option.image)?.label || "No image"}
                                  </span>
                                  <span style={{ 
                                    fontSize: "18px", 
                                    color: "#333", 
                                    fontWeight: "600", 
                                    transform: "translateY(-3px)",
                                    flexShrink: 0,
                                    paddingLeft: "3px"
                                  }}>⌵</span>
                                </div>
                                
                                {imageDropdownOpen === `imageDropdown_${index}` && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: 0,
                                      right: 0,
                                      background: "white",
                                      border: "1px solid #E9DDD3",
                                      borderRadius: "8px",
                                      marginTop: "4px",
                                      maxHeight: "200px",
                                      overflowY: "auto",
                                      zIndex: 1000,
                                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                    }}
                                  >
                                    {availableImages.map((image) => (
                                      <div
                                        key={image.value}
                                        onClick={() => {
                                          // Remove any existing popups
                                          const existingPopups = document.querySelectorAll('[data-image-preview]');
                                          existingPopups.forEach(popup => popup.remove());
                                          
                                          if (node) {
                                            const component = components.get(node.data.componentId);
                                            if (component) {
                                              const currentOptions = component.content.multiSelect?.options || [{ text: "" }];
                                              const newOptions = [...currentOptions];
                                              newOptions[index] = { ...newOptions[index], image: image.value };
                                              
                                              const updatedComponent = {
                                                ...component,
                                                content: {
                                                  ...component.content,
                                                  multiSelect: {
                                                    ...component.content.multiSelect,
                                                    options: newOptions
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
                                          setImageDropdownOpen(false);
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "#f5f5f5";
                                          if (image.value) {
                                            const popup = document.createElement('div');
                                            popup.setAttribute('data-image-preview', 'true');
                                            popup.style.cssText = `
                                              position: fixed;
                                              top: ${e.clientY + 10}px;
                                              left: ${e.clientX + 10}px;
                                              z-index: 10001;
                                              background: white;
                                              border: 1px solid #E9DDD3;
                                              border-radius: 8px;
                                              padding: 8px;
                                              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                              max-width: 200px;
                                              max-height: 200px;
                                            `;
                                            popup.innerHTML = `<img src="${image.value}" style="width: 100%; height: 100%; object-fit: contain;" alt="Preview" />`;
                                            document.body.appendChild(popup);
                                            e.currentTarget.addEventListener('mouseleave', () => {
                                              popup.remove();
                                            }, { once: true });
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "white";
                                          // Remove any existing popups
                                          const existingPopups = document.querySelectorAll('[data-image-preview]');
                                          existingPopups.forEach(popup => popup.remove());
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          cursor: "pointer",
                                          borderBottom: "1px solid #f0f0f0",
                                          fontSize: "14px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        }}
                                      >
                                        <img 
                                          src={image.value} 
                                          alt={image.label} 
                                          style={{ 
                                            width: "20px", 
                                            height: "15px", 
                                            objectFit: "cover",
                                            borderRadius: "2px"
                                          }} 
                                        />
                                        {image.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Image thumbnail preview */}
                              <div style={{ 
                                width: "45px", 
                                height: "45px", 
                                borderRadius: "8px", 
                                overflow: "hidden", 
                                background: "#F5F5F5",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                {option.image ? (
                                  <img 
                                    src={option.image} 
                                    alt="Preview" 
                                    style={{ 
                                      width: "100%", 
                                      height: "100%", 
                                      objectFit: "cover" 
                                    }} 
                                  />
                                ) : (
                                  <span style={{ 
                                    color: "#999", 
                                    fontSize: "11px", 
                                    textAlign: "center",
                                    fontWeight: "400"
                                  }}>
                                    No img
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {(component?.content.multiSelect?.options?.length || 1) > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const currentOptions = component.content.multiSelect?.options || [{ text: "" }];
                                      const newOptions = currentOptions.filter((_, i) => i !== index);
                                      
                                      // Ensure we always have at least one option field
                                      if (newOptions.length === 0) {
                                        newOptions.push({ text: "" });
                                      }
                                      
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          multiSelect: {
                                            ...component.content.multiSelect,
                                            options: newOptions
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
                                style={{
                                  background: "#F16B68",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  outline: "none",
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            if (node) {
                              const component = components.get(node.data.componentId);
                              if (component) {
                                const currentOptions = component.content.multiSelect?.options || [{ text: "" }];
                                const newOptions = [...currentOptions, { text: "" }];
                                
                                const updatedComponent = {
                                  ...component,
                                  content: {
                                    ...component.content,
                                    multiSelect: {
                                      ...component.content.multiSelect,
                                      options: newOptions
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
                          style={{
                            background: "#8EAF86",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            marginTop: "4px",
                            outline: "none",
                          }}
                        >
                          + Add Option
                        </button>
                      </div>
                      
                      {/* Branch Routing Logic Section - only show when checked */}
                      {branchRoutingAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <div style={{
                            fontSize: "14px",
                            color: "#003250",
                            fontWeight: "700",
                            marginBottom: "16px"
                          }}>
                            Branch Routing Logic
                          </div>
                          
                          {component?.content.multiSelect?.options?.map((option: MultiSelectOption, index: number) => (
                            <div key={index} style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              marginBottom: "12px"
                            }}>
                              <span style={{
                                fontSize: "14px",
                                color: "#003250",
                                minWidth: "120px"
                              }}>
                                When user chooses "{option.text}" →
                              </span>
                              <input
                                type="text"
                                placeholder="Enter component slug..."
                                value={(component?.content as any)?.branchRouting?.[index]?.destinationSlug || ""}
                                onChange={(e) => {
                                  if (node) {
                                    const component = components.get(node.data.componentId);
                                    if (component) {
                                      const updatedComponent = {
                                        ...component,
                                        content: {
                                          ...component.content,
                                          branchRouting: {
                                            ...(component.content as any).branchRouting,
                                            [index]: {
                                              optionText: option.text,
                                              destinationSlug: e.target.value
                                            }
                                          }
                                        },
                                        updatedAt: new Date()
                                      };
                                      setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                      
                                      // Dispatch event to update component data
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
                                style={{
                                  flex: 1,
                                  padding: "8px 12px",
                                  border: "1px solid #E9DDD3",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  fontFamily: "inherit",
                                  background: "white",
                                  outline: "none"
                                }}
                                onFocus={(e) => {
                                  e.target.style.border = "2px solid #003250";
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = "1px solid #E9DDD3";
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Move On Button Section - only show when checked */}
                      {moveOnButtonAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Move On Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.moveOnButton?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      moveOnButton: {
                                        text: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter button text (e.g., 'Continue', 'Next', 'Submit')..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Celebration Modal Section - only show when checked */}
                      {celebrationModalAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Title:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.title || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        title: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal title..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Content:</label>
                          <textarea
                            value={(component?.content as any)?.celebrationModal?.content || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        content: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginTop: "8px",
                              marginBottom: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Description:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.description || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        description: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal description..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Media:</label>
                          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
                            <select
                              value={(component?.content as any)?.celebrationModal?.media || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        celebrationModal: {
                                          ...(component.content as any).celebrationModal,
                                          media: e.target.value
                                        }
                                      },
                                      updatedAt: new Date()
                                    };
                                    setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                    
                                    // Dispatch event to update component data
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
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="">Select an image...</option>
                              {availableImages.map((image, index) => (
                                <option key={index} value={image.value}>
                                  {image.label}
                                </option>
                              ))}
                            </select>
                            {(component?.content as any)?.celebrationModal?.media && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                padding: "8px",
                                marginTop: "4px",
                                zIndex: 10,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                <img
                                  src={(component?.content as any)?.celebrationModal?.media}
                                  alt="Selected"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "100px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <label style={{ fontWeight: "700" }}>Call to Action Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.callToActionText || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        callToActionText: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter call to action button text..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Time to Load (milliseconds):</label>
                          <input
                            type="number"
                            min="0"
                            value={(component?.content as any)?.celebrationModal?.timeToLoad || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        timeToLoad: parseInt(e.target.value) || 0
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter time to load in milliseconds..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                } else {
                  return (
                    <>
                      {bannerField}
                      {textField}
                      {(bannerAddOn || textAddOn) && (
                        <div style={{
                          borderBottom: "1px solid #E9DDD3",
                          marginBottom: "20px",
                          paddingBottom: "16px"
                        }} />
                      )}
                      <label style={{ fontWeight: "700" }}>Message Content:</label>
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
                          marginBottom: "16px",
                          resize: "vertical",
                          boxSizing: "border-box",
                          transform: "translate(-2px, -3px)",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "2px solid #003250";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E9DDD3";
                        }}
                      />
                      
                      {/* Move On Button Section - only show when checked */}
                      {moveOnButtonAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Move On Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.moveOnButton?.text || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      moveOnButton: {
                                        text: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter button text (e.g., 'Continue', 'Next', 'Submit')..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Celebration Modal Section - only show when checked */}
                      {celebrationModalAddOn && (
                        <div style={{
                          backgroundColor: "#F2E8E0",
                          border: "1px solid #E9DDD3",
                          padding: "16px",
                          marginTop: "16px",
                          marginLeft: "-20px",
                          marginRight: "-20px"
                        }}>
                          <label style={{ fontWeight: "700" }}>Title:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.title || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        title: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal title..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Content:</label>
                          <textarea
                            value={(component?.content as any)?.celebrationModal?.content || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        content: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal content..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              marginTop: "8px",
                              marginBottom: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                              background: "white",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Description:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.description || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        description: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter celebration modal description..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Media:</label>
                          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
                            <select
                              value={(component?.content as any)?.celebrationModal?.media || ""}
                              onChange={(e) => {
                                if (node) {
                                  const component = components.get(node.data.componentId);
                                  if (component) {
                                    const updatedComponent = {
                                      ...component,
                                      content: {
                                        ...component.content,
                                        celebrationModal: {
                                          ...(component.content as any).celebrationModal,
                                          media: e.target.value
                                        }
                                      },
                                      updatedAt: new Date()
                                    };
                                    setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                    
                                    // Dispatch event to update component data
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
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                background: "white",
                                outline: "none",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.target.style.border = "2px solid #003250";
                              }}
                              onBlur={(e) => {
                                e.target.style.border = "1px solid #E9DDD3";
                              }}
                            >
                              <option value="">Select an image...</option>
                              {availableImages.map((image, index) => (
                                <option key={index} value={image.value}>
                                  {image.label}
                                </option>
                              ))}
                            </select>
                            {(component?.content as any)?.celebrationModal?.media && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                right: "0",
                                backgroundColor: "white",
                                border: "1px solid #E9DDD3",
                                borderRadius: "8px",
                                padding: "8px",
                                marginTop: "4px",
                                zIndex: 10,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                <img
                                  src={(component?.content as any)?.celebrationModal?.media}
                                  alt="Selected"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "100px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <label style={{ fontWeight: "700" }}>Call to Action Button Text:</label>
                          <input
                            type="text"
                            value={(component?.content as any)?.celebrationModal?.callToActionText || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        callToActionText: e.target.value
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter call to action button text..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              marginBottom: "16px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                          
                          <label style={{ fontWeight: "700" }}>Time to Load (milliseconds):</label>
                          <input
                            type="number"
                            min="0"
                            value={(component?.content as any)?.celebrationModal?.timeToLoad || ""}
                            onChange={(e) => {
                              if (node) {
                                const component = components.get(node.data.componentId);
                                if (component) {
                                  const updatedComponent = {
                                    ...component,
                                    content: {
                                      ...component.content,
                                      celebrationModal: {
                                        ...(component.content as any).celebrationModal,
                                        timeToLoad: parseInt(e.target.value) || 0
                                      }
                                    },
                                    updatedAt: new Date()
                                  };
                                  setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                                  
                                  // Dispatch event to update component data
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
                            placeholder="Enter time to load in milliseconds..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #E9DDD3",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              background: "white",
                              outline: "none",
                              marginTop: "8px",
                              boxSizing: "border-box"
                            }}
                            onFocus={(e) => {
                              e.target.style.border = "2px solid #003250";
                            }}
                            onBlur={(e) => {
                              e.target.style.border = "1px solid #E9DDD3";
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                }
              })()}
            </div>
            

            
            <div className="edit-window-footer">
              <button
                className="save-btn"
                onClick={() => {
                  // Update component data with current banner add-on state
                  const node = nodes.find(n => n.data.messageId === editingMessageId);
                  if (node) {
                    const component = components.get(node.data.componentId);
                    if (component) {
                      // Update component with banner, text add-on, and AI-generated state
                      const updatedComponent = {
                        ...component,
                        content: {
                          ...component.content,
                          banner: bannerAddOn ? {
                            text: component.content.banner?.text || "",
                            type: "default"
                          } : undefined,
                          text: textAddOn ? {
                            text: (component.content as any).text?.text || "",
                            type: "default",
                            millisecondsToLoad: (component.content as any).text?.millisecondsToLoad || 0
                          } : undefined,
                          moveOnButton: moveOnButtonAddOn ? {
                            text: (component.content as any).moveOnButton?.text || ""
                          } : undefined,
                          celebrationModal: celebrationModalAddOn ? {
                            title: (component.content as any).celebrationModal?.title || "",
                            content: (component.content as any).celebrationModal?.content || "",
                            description: (component.content as any).celebrationModal?.description || "",
                            media: (component.content as any).celebrationModal?.media || "",
                            callToActionText: (component.content as any).celebrationModal?.callToActionText || "",
                            timeToLoad: (component.content as any).celebrationModal?.timeToLoad || 0
                          } : undefined
                        },
                        aiGenerated: aiGenerated,
                        updatedAt: new Date()
                      };
                      
                      // Save updated component to state
                      setComponents(prev => new Map(prev).set(component.id, updatedComponent));
                      
                      let content = "";
                      if (component.uiToolType === "question") {
                        content = component.content.question?.text || "";
                      } else if (component.uiToolType === "multiSelect") {
                        content = component.content.multiSelect?.text || "";
                      } else {
                        content = component.content.message?.text || "";
                      }
                        
                      // Dispatch event to update message content
                      const contentEvent = new CustomEvent("updateMessageContent", {
                        detail: { 
                          messageId: editingMessageId, 
                          content: content
                        },
                      });
                      window.dispatchEvent(contentEvent);
                      
                      // Dispatch event to update component data (for banner, etc.)
                      const componentEvent = new CustomEvent("updateComponentData", {
                        detail: { 
                          messageId: editingMessageId, 
                          componentData: updatedComponent
                        },
                      });
                      window.dispatchEvent(componentEvent);
                    }
                  }
                  setEditingMessageId(null);
                  setOriginalComponentData(null);
                  // Dispatch event to clear highlight in preview
                  const event = new CustomEvent("editWindowClose");
                  window.dispatchEvent(event);
                }}
                style={{
                  background: "#F16B68",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  // Restore original component data if it exists
                  if (originalComponentData && editingMessageId) {
                    const node = nodes.find(n => n.data.messageId === editingMessageId);
                    if (node) {
                      setComponents(prev => new Map(prev).set(originalComponentData.id, originalComponentData));
                      
                      // Dispatch event to update preview with original data
                      const event = new CustomEvent("updateComponentData", {
                        detail: { 
                          messageId: editingMessageId, 
                          componentData: originalComponentData 
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }
                  
                  setEditingMessageId(null);
                  setOriginalComponentData(null);
                  // Dispatch event to clear highlight in preview
                  const event = new CustomEvent("editWindowClose");
                  window.dispatchEvent(event);
                }}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginLeft: "8px",
                  outline: "none",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Images Popup Overlay */}
      {showImagesPopup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}>
              <h2 style={{ margin: 0, color: "#333" }}>Image Library</h2>
              <button
                onClick={() => setShowImagesPopup(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
              maxHeight: "70vh",
              overflow: "auto",
            }}>
              {/* All images from public folder */}
              {[
                // Main images
                { name: "assessment-start.png", path: "/img/assessment-start.png" },
                { name: "avatar.png", path: "/img/avatar.png" },
                { name: "axial-mark.svg", path: "/img/axial-mark.svg" },
                { name: "career-findings-header.png", path: "/img/career-findings-header.png" },
                { name: "chat.png", path: "/img/chat.png" },
                { name: "clarity-header.png", path: "/img/clarity-header.png" },
                { name: "clarity-header.svg", path: "/img/clarity-header.svg" },
                { name: "clouds.svg", path: "/img/clouds.svg" },
                { name: "profile-mock.png", path: "/img/profile-mock.png" },
                { name: "login-thumb.png", path: "/img/login-thumb.png" },
                { name: "home-clarity.png", path: "/img/home-clarity.png" },
                { name: "home-other.png", path: "/img/home-other.png" },
                { name: "vite.svg", path: "/vite.svg" },
                
                // Home thumbnails
                { name: "clarity-thumb.png", path: "/img/home/clarity-thumb.png" },
                { name: "connections-thumb.png", path: "/img/home/connections-thumb.png" },
                { name: "credentials-thumb.png", path: "/img/home/credentials-thumb.png" },
                { name: "visibility-thumb.png", path: "/img/home/visibility-thumb.png" },
                
                // Intro images
                { name: "intro-connections.png", path: "/img/intro/intro-connections.png" },
                { name: "intro-profile.png", path: "/img/intro/intro-profile.png" },
                
                // Onboarding images
                { name: "career-growth.png", path: "/img/onboarding/career-growth.png" },
                { name: "finding-the-right-career.png", path: "/img/onboarding/finding-the-right-career.png" },
                { name: "getting-a-job.png", path: "/img/onboarding/getting-a-job.png" },
                { name: "leadership-development.png", path: "/img/onboarding/leadership-development.png" },
                { name: "networking-opportunities.png", path: "/img/onboarding/networking-opportunities.png" },
                { name: "personal-growth.png", path: "/img/onboarding/personal-growth.png" },
                
                // Assessment images (all the numbered images)
                { name: "assessment-1.png", path: "/img/assessment/1737073103251x172902281481551870.png" },
                { name: "assessment-2.png", path: "/img/assessment/1737073115774x613797929973448700.png" },
                { name: "assessment-3.png", path: "/img/assessment/1737073145427x700685284803346400.png" },
                { name: "assessment-4.png", path: "/img/assessment/1737073157096x776507020994412500.png" },
                { name: "assessment-5.png", path: "/img/assessment/1737073185345x482787881745121300.png" },
                { name: "assessment-6.png", path: "/img/assessment/1737073199960x562508693030043650.png" },
                { name: "assessment-7.png", path: "/img/assessment/1737073219127x274753412849467400.png" },
                { name: "assessment-8.png", path: "/img/assessment/1737073228950x776109012957265900.png" },
                { name: "assessment-9.png", path: "/img/assessment/1737073244848x337970816021430300.png" },
                { name: "assessment-10.png", path: "/img/assessment/1737073257738x951553735686881300.png" },
                { name: "assessment-11.png", path: "/img/assessment/1737073276576x970070120695070700.png" },
                { name: "assessment-12.png", path: "/img/assessment/1737073286644x155782848464289800.png" },
                { name: "assessment-13.png", path: "/img/assessment/1737073325420x395772772218568700.png" },
                { name: "assessment-14.png", path: "/img/assessment/1737073334734x364099672101355500.png" },
                { name: "assessment-15.png", path: "/img/assessment/1737073352706x332837390304935940.png" },
                { name: "assessment-16.png", path: "/img/assessment/1737073360818x559104714837852200.png" },
                { name: "assessment-17.png", path: "/img/assessment/1737073380037x460219962055720960.png" },
                { name: "assessment-18.png", path: "/img/assessment/1737073388324x137990978149285890.png" },
                { name: "assessment-19.png", path: "/img/assessment/1737073403200x790903030341173200.png" },
                { name: "assessment-20.png", path: "/img/assessment/1737073413172x136524186378567680.png" },
                { name: "assessment-21.png", path: "/img/assessment/1737073430470x143620217451577340.png" },
                { name: "assessment-22.png", path: "/img/assessment/1737073438002x357933086537154560.png" },
                { name: "assessment-23.png", path: "/img/assessment/1737073455002x254970852455481340.png" },
                { name: "assessment-24.png", path: "/img/assessment/1737073463656x485530083098361860.png" },
                { name: "assessment-25.png", path: "/img/assessment/1737073513752x807670121866199000.png" },
                { name: "assessment-26.png", path: "/img/assessment/1737073521588x691329728926449700.png" },
                { name: "assessment-27.png", path: "/img/assessment/1737073534602x932118834809143300.png" },
                { name: "assessment-28.png", path: "/img/assessment/1737073553458x532046035564101600.png" },
                { name: "assessment-29.png", path: "/img/assessment/1737073572017x977006328469258200.png" },
                { name: "assessment-30.png", path: "/img/assessment/1737073580424x164060162485911550.png" },
                { name: "assessment-31.png", path: "/img/assessment/1737073593669x506636291092774900.png" },
                { name: "assessment-32.png", path: "/img/assessment/1737073606326x138136713487712260.png" },
                { name: "assessment-33.png", path: "/img/assessment/1737073620244x761600220017459200.png" },
                { name: "assessment-34.png", path: "/img/assessment/1737073625869x662131296860373000.png" },
                { name: "assessment-35.png", path: "/img/assessment/1737073637833x259216453040078850.png" },
                { name: "assessment-36.png", path: "/img/assessment/1737073648204x549712032707903500.png" },
                { name: "assessment-37.png", path: "/img/assessment/1737073694877x710244893043982300.png" },
                { name: "assessment-38.png", path: "/img/assessment/1737073708665x808520554165305300.png" },
                { name: "assessment-39.png", path: "/img/assessment/1737073723111x275346479634186240.png" },
                { name: "assessment-40.png", path: "/img/assessment/1737073729344x580294875353186300.png" },
                { name: "assessment-41.png", path: "/img/assessment/1737073743110x381465187950526460.png" },
                { name: "assessment-42.png", path: "/img/assessment/1737073750092x553261188064477200.png" },
                { name: "assessment-43.png", path: "/img/assessment/1737073763985x184446150030393340.png" },
                { name: "assessment-44.png", path: "/img/assessment/1737073773430x544484296143142900.png" },
                { name: "assessment-45.png", path: "/img/assessment/1737073785879x916255055020032000.png" },
                { name: "assessment-46.png", path: "/img/assessment/1737073792368x288248526004551700.png" },
                { name: "assessment-47.png", path: "/img/assessment/1737073808463x538973694971084800.png" },
                { name: "assessment-48.png", path: "/img/assessment/1737073820127x661266696548909000.png" },
                { name: "assessment-49.png", path: "/img/assessment/1737073837587x242411440770646000.png" },
                { name: "assessment-50.png", path: "/img/assessment/1737073845176x831091857542348800.png" },
                { name: "assessment-51.png", path: "/img/assessment/1737073872180x832122080371671000.png" },
                { name: "assessment-52.png", path: "/img/assessment/1737073880162x831294481101750300.png" },
                { name: "assessment-53.png", path: "/img/assessment/1737073897887x568048395451367400.png" },
                { name: "assessment-54.png", path: "/img/assessment/1737073907411x982383147230691300.png" },
                { name: "assessment-55.png", path: "/img/assessment/1737073920325x506301852938666000.png" },
                { name: "assessment-56.png", path: "/img/assessment/1737073928761x487901223840383000.png" },
                { name: "assessment-57.png", path: "/img/assessment/1737073946296x221336882923438100.png" },
                { name: "assessment-58.png", path: "/img/assessment/1737073954368x904092157911236600.png" },
                { name: "assessment-59.png", path: "/img/assessment/1737073971935x380292910184923140.png" },
                { name: "assessment-60.png", path: "/img/assessment/1737073980945x516493849019547650.png" },
                { name: "assessment-61.png", path: "/img/assessment/1737073997241x447049289283928060.png" },
                { name: "assessment-62.png", path: "/img/assessment/1737074004882x698828942365425700.png" },
                { name: "assessment-63.png", path: "/img/assessment/1737074025047x171361812832059400.png" },
                { name: "assessment-64.png", path: "/img/assessment/1737074033328x573167398071828500.png" },
                { name: "assessment-65.png", path: "/img/assessment/1737074053332x631017088713752600.png" },
                { name: "assessment-66.png", path: "/img/assessment/1737074061509x372696027024326660.png" },
                { name: "assessment-67.png", path: "/img/assessment/1737074079285x528874552774623200.png" },
                { name: "assessment-68.png", path: "/img/assessment/1737074090092x546430270947459100.png" },
                { name: "assessment-69.png", path: "/img/assessment/1737074109653x636555905770192900.png" },
                { name: "assessment-70.png", path: "/img/assessment/1737074118759x900708562306859000.png" },
                { name: "assessment-71.png", path: "/img/assessment/1737074148429x319939190386589700.png" },
                { name: "assessment-72.png", path: "/img/assessment/1737074156756x150612309136375800.png" },
                { name: "assessment-73.png", path: "/img/assessment/1737074172700x928738393004703700.png" },
                { name: "assessment-74.png", path: "/img/assessment/1737074180699x711794184609333200.png" },
                { name: "assessment-75.png", path: "/img/assessment/1737074193926x470423531755143200.png" },
                { name: "assessment-76.png", path: "/img/assessment/1737074202060x730003261199482900.png" },
                { name: "assessment-77.png", path: "/img/assessment/1737074231535x718316187461615600.png" },
                { name: "assessment-78.png", path: "/img/assessment/1737074238447x394520976237264900.png" },
                { name: "assessment-79.png", path: "/img/assessment/1737074253189x424121296352706560.png" },
                { name: "assessment-80.png", path: "/img/assessment/1737074260706x877394102258761700.png" },
                { name: "assessment-81.png", path: "/img/assessment/1737074278638x135093427621855230.png" },
                { name: "assessment-82.png", path: "/img/assessment/1737074285226x528853024232177660.png" },
                { name: "assessment-83.png", path: "/img/assessment/1737074297424x770277121707475000.png" },
                { name: "assessment-84.png", path: "/img/assessment/1737074305727x493057622765731800.png" },
                { name: "assessment-85.png", path: "/img/assessment/1737074318110x628240280708448300.png" },
                { name: "assessment-86.png", path: "/img/assessment/1737074324797x155628070924451840.png" },
                { name: "assessment-87.png", path: "/img/assessment/1737074338099x332376476383707140.png" },
                { name: "assessment-88.png", path: "/img/assessment/1737074357335x629258047334907900.png" },
                { name: "assessment-89.png", path: "/img/assessment/1737074379012x670608686568702000.png" },
                { name: "assessment-90.png", path: "/img/assessment/1737074385496x275713184879345660.png" },
                
                // Steps images - Assessment
                { name: "assessment-celebration.png", path: "/img/steps/assessment/celebration.png" },
                
                // Steps images - Career Paths
                { name: "career-paths-celebration.png", path: "/img/steps/careerPaths/celebration.png" },
                
                // Steps images - Career Statement
                { name: "career-statement-celebration.png", path: "/img/steps/careerStatement/celebration.png" },
                { name: "career-statement-q1.png", path: "/img/steps/careerStatement/question/1.png" },
                
                // Steps images - Dream Job
                { name: "dream-job-celebration-alt.png", path: "/img/steps/dreamJob/celebration-alt.png" },
                { name: "dream-job-celebration.png", path: "/img/steps/dreamJob/celebration.png" },
                
                // Steps images - Financial Needs
                { name: "financial-needs-celebration.png", path: "/img/steps/financialNeeds/celebration.png" },
                { name: "financial-needs-q1.png", path: "/img/steps/financialNeeds/question/1.png" },
                { name: "financial-needs-q2.png", path: "/img/steps/financialNeeds/question/2.png" },
                { name: "financial-needs-q3.png", path: "/img/steps/financialNeeds/question/3.png" },
                { name: "financial-needs-q4.png", path: "/img/steps/financialNeeds/question/4.png" },
                { name: "financial-needs-q5.png", path: "/img/steps/financialNeeds/question/5.png" },
                { name: "financial-needs-q6.png", path: "/img/steps/financialNeeds/question/6.png" },
                { name: "financial-needs-q7.png", path: "/img/steps/financialNeeds/question/7.png" },
                { name: "financial-needs-q8.png", path: "/img/steps/financialNeeds/question/8.png" },
                
                // Steps images - Inspirations
                { name: "inspirations-celebration.png", path: "/img/steps/inspirations/celebration.png" },
                { name: "inspirations-q1.png", path: "/img/steps/inspirations/question/1.png" },
                { name: "inspirations-q2.png", path: "/img/steps/inspirations/question/2.png" },
                { name: "inspirations-q3.png", path: "/img/steps/inspirations/question/3.png" },
                { name: "inspirations-q4.png", path: "/img/steps/inspirations/question/4.png" },
                { name: "inspirations-q5.png", path: "/img/steps/inspirations/question/5.png" },
                { name: "inspirations-q6.png", path: "/img/steps/inspirations/question/6.png" },
                
                // Steps images - Living Environment
                { name: "living-environment-celebration.png", path: "/img/steps/livingEnvironment/celebration.png" },
                { name: "living-environment-q1.png", path: "/img/steps/livingEnvironment/question/1.png" },
                { name: "living-environment-q2.png", path: "/img/steps/livingEnvironment/question/2.png" },
                { name: "living-environment-q3.png", path: "/img/steps/livingEnvironment/question/3.png" },
                { name: "living-environment-q4.png", path: "/img/steps/livingEnvironment/question/4.png" },
                { name: "living-environment-q5.png", path: "/img/steps/livingEnvironment/question/5.png" },
                { name: "living-environment-q6.png", path: "/img/steps/livingEnvironment/question/6.png" },
                
                // Steps images - Strengths
                { name: "strengths-celebration.png", path: "/img/steps/strengths/celebration.png" },
                { name: "strengths-q1.png", path: "/img/steps/strengths/question/1.png" },
                { name: "strengths-q2.png", path: "/img/steps/strengths/question/2.png" },
                { name: "strengths-q3.png", path: "/img/steps/strengths/question/3.png" },
                { name: "strengths-q4.png", path: "/img/steps/strengths/question/4.png" },
                { name: "strengths-q5.png", path: "/img/steps/strengths/question/5.png" },
                { name: "strengths-q6.png", path: "/img/steps/strengths/question/6.png" },
                
                // Steps images - Values
                { name: "values-celebration.png", path: "/img/steps/values/celebration.png" },
                { name: "values-q1.png", path: "/img/steps/values/question/1.png" },
                { name: "values-q2.png", path: "/img/steps/values/question/2.png" },
                { name: "values-q3.png", path: "/img/steps/values/question/3.png" },
                { name: "values-q4.png", path: "/img/steps/values/question/4.png" },
                { name: "values-q5.png", path: "/img/steps/values/question/5.png" },
                { name: "values-q6.png", path: "/img/steps/values/question/6.png" },
                
                // Steps images - Work Environment
                { name: "work-environment-celebration.png", path: "/img/steps/workEnvironment/celebration.png" },
                { name: "work-environment-q1.png", path: "/img/steps/workEnvironment/question/1.png" },
                { name: "work-environment-q2.png", path: "/img/steps/workEnvironment/question/2.png" },
                { name: "work-environment-q3.png", path: "/img/steps/workEnvironment/question/3.png" },
                { name: "work-environment-q4.png", path: "/img/steps/workEnvironment/question/4.png" },
                { name: "work-environment-q5.png", path: "/img/steps/workEnvironment/question/5.png" },
                { name: "work-environment-q6.png", path: "/img/steps/workEnvironment/question/6.png" },
              ].map((image, index) => (
                <div key={index} style={{
                  border: "1px solid #E9DDD3",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}>
                  <div style={{
                    width: "100%",
                    height: "120px",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    <img
                      src={image.path}
                      alt={image.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                    <div style={{
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      fontSize: "12px",
                    }}>
                      Image not found
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    defaultValue={image.name}
                    style={{
                      padding: "6px 8px",
                      border: "1px solid #E9DDD3",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                    placeholder="Image name"
                  />
                  
                  <div style={{
                    display: "flex",
                    gap: "4px",
                  }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "4px 8px",
                        border: "1px solid #E9DDD3",
                        borderRadius: "4px",
                        fontSize: "11px",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Copy Path
                    </button>
                    <button
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #F16B68",
                        borderRadius: "4px",
                        fontSize: "11px",
                        background: "white",
                        color: "#F16B68",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

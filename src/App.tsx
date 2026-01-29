import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Plus, Trash2, Download, Unplug, AlertTriangle, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import CustomNode from './components/CustomNode';
import Sidebar from './components/Sidebar';
import JsonPreview from './components/JsonPreview';
import { generateFlowJson, restoreFlowFromJson } from '../utils/flowUtils';
import { FlowNodeData, StepType } from './types';
import { INITIAL_FLOW_NAME } from './constants';

const nodeTypes = {
  custom: CustomNode,
};

// Start is Sequence 0
const INITIAL_NODES: Node<FlowNodeData>[] = [
  {
    id: 'start',
    type: 'custom',
    position: { x: 50, y: 50 },
    data: { 
      label: 'Start / Configuration', 
      sequence_order: 0, 
      value: '', 
      isStartNode: true 
    },
    deletable: false,
    draggable: false, 
  },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // Global State
  const [flowName, setFlowName] = useState(INITIAL_FLOW_NAME);
  const [iterateFlow, setIterateFlow] = useState(false);
  const [getIterateList, setGetIterateList] = useState("");

  // Modals
  const [showJson, setShowJson] = useState(false);
  const [generatedResult, setGeneratedResult] = useState({ json: {} });
  
  // UI State for Warnings
  const [showWarningList, setShowWarningList] = useState(false);
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize default edge options to prevent unnecessary re-renders (fixes #310)
  const defaultEdgeOptions = useMemo(() => ({
    type: 'step', 
    animated: true, 
    style: { strokeWidth: 2 } 
  }), []);

  // --- Auto Layout Logic (Staircase) ---
  useEffect(() => {
    setNodes((currentNodes) => {
      // Create a map to check for duplicate sequence orders
      const orderCounts: Record<number, number> = {};
      currentNodes.forEach(n => {
        const order = n.data.sequence_order;
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      });

      // Prepare updated nodes with new positions and error states
      const updatedNodes = currentNodes.map((n) => {
        const order = n.data.sequence_order;
        const isDuplicate = orderCounts[order] > 1; // Start node (0) usually unique, but if user sets another node to 0 it's a conflict
        
        // Update error state if changed
        const newData = { ...n.data };
        if (newData.hasError !== isDuplicate) {
          newData.hasError = isDuplicate;
        }

        // Calculate Position (Staircase / Ladder)
        // Start Node at 0,0 (relative to canvas origin set in initial)
        // Each step moves Down (Y) and Right (X)
        const START_X = 50;
        const START_Y = 50;
        const X_STEP = 300; // Wide enough for node + gap
        const Y_STEP = 150; // Tall enough for node + gap

        let newX = START_X + (order * X_STEP);
        let newY = START_Y + (order * Y_STEP);

        // Handle duplicates visually by shifting them slightly so they don't perfectly overlap
        // We find the index of this node among nodes with same order
        const peers = currentNodes.filter(p => p.data.sequence_order === order);
        if (peers.length > 1) {
            const index = peers.findIndex(p => p.id === n.id);
            // Stack them vertically with a small offset
            newX += (index * 20);
            newY += (index * 20);
        }

        return {
          ...n,
          position: { x: newX, y: newY },
          draggable: false, // Enforce layout
          data: newData
        };
      });

      // Only return a new array if something actually changed to avoid infinite loops
      // We check if positions or data.hasError changed
      const hasChanges = updatedNodes.some((n, i) => {
        const old = currentNodes[i];
        return (
          n.position.x !== old.position.x || 
          n.position.y !== old.position.y ||
          n.data.hasError !== old.data.hasError
        );
      });

      return hasChanges ? updatedNodes : currentNodes;
    });
  }, [nodes.length, JSON.stringify(nodes.map(n => ({ id: n.id, order: n.data.sequence_order })))]); 


  // --- Validation Checks ---
  const duplicateOrders = useMemo(() => {
    const orders = nodes.map(n => n.data.sequence_order);
    return orders.filter((item, index) => orders.indexOf(item) !== index);
  }, [nodes]);
  
  const hasDuplicates = duplicateOrders.length > 0;

  // Start Node Edge Check for Edge Coloring
  const startEdgesCount = useMemo(() => edges.filter(e => e.source === 'start').length, [edges]);
  const isStartConfigurationValid = useMemo(() => {
    if (iterateFlow) return true;
    return startEdgesCount <= 1;
  }, [iterateFlow, startEdgesCount]);

  // Comprehensive Validation for Top Bar
  const flowWarnings = useMemo(() => {
    const warnings: string[] = [];

    // 1. Global Checks
    if (hasDuplicates) warnings.push("Duplicate Sequence # Detected");
    
    if (!iterateFlow && startEdgesCount > 1) {
      warnings.push("Invalid Start Connection (Single path only)");
    }

    const stepNodes = nodes.filter(n => !n.data.isStartNode);
    if (stepNodes.length > 0) {
       // Find true last node by sequence
       const lastNode = stepNodes.reduce((prev, current) => 
         (prev.data.sequence_order > current.data.sequence_order) ? prev : current
       , stepNodes[0]);
       
       if (lastNode.data.type !== StepType.CONCAT) {
         warnings.push("Flow must end with CONCAT");
       }
    } else {
        // Technically strict: must have at least one step? 
        // Let's assume empty flow is okay or handled by 'last step' check implicitly if we wanted.
    }

    if (iterateFlow && !getIterateList.trim()) {
      warnings.push("Iteration Query Empty");
    }

    // 2. Per Node Checks
    nodes.forEach(node => {
      if (node.data.isStartNode) return;

      // Empty SQL
      if (node.data.type === StepType.SQL && (!node.data.value || !node.data.value.trim())) {
        warnings.push(`Step ${node.data.sequence_order}: SQL Query is empty`);
      }

      // Incomplete Time Config
      if (node.data.type === StepType.SQL && node.data.append_time_column) {
        if (!node.data.time_amount || !node.data.time_grain || !node.data.time_mode) {
           warnings.push(`Step ${node.data.sequence_order}: Incomplete Time Configuration`);
        }
      }

      // Invalid Placeholders logic
      const incomingEdges = edges.filter(e => e.target === node.id);
      const sourceIds = incomingEdges.map(e => e.source);
      const predecessors = nodes.filter(n => sourceIds.includes(n.id));
      const isConnectedToStart = sourceIds.includes('start');

      const regex = /\{\{(.*?)\}\}/g;
      const matches = [...(node.data.value || '').matchAll(regex)].map(m => m[1]);
      const uniqueTags = [...new Set(matches)];

      uniqueTags.forEach(tag => {
        if (tag === 'iteration_value') {
          if (!iterateFlow) {
              warnings.push(`Step ${node.data.sequence_order}: {{iteration_value}} requires Iterated Flow`);
          } else if (!isConnectedToStart) {
              warnings.push(`Step ${node.data.sequence_order}: {{iteration_value}} used but not connected to Start`);
          }
        } else if (tag.startsWith('step_')) {
          const stepNum = parseInt(tag.replace('step_', ''), 10);
          if (!isNaN(stepNum)) {
             const hasPred = predecessors.some(p => p.data.sequence_order === stepNum);
             if (!hasPred) {
                warnings.push(`Step ${node.data.sequence_order}: {{${tag}}} used but Step ${stepNum} is not connected`);
             }
          }
        }
      });
    });

    return warnings;
  }, [nodes, edges, iterateFlow, getIterateList, hasDuplicates, startEdgesCount]);

  const isValidFlow = flowWarnings.length === 0;

  // --- Interactions ---

  const validateConnections = useCallback((source: string, target: string, currentEdges: Edge[]) => {
    if (source === 'start') {
      const existingStartEdges = currentEdges.filter(e => e.source === 'start');
      if (!iterateFlow && existingStartEdges.length > 0) {
        alert("Without 'Iterate Flow' enabled, the start node can only connect to one step.");
        return false;
      }
    }
    return true;
  }, [iterateFlow]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      setEdges((eds) => {
        if (!validateConnections(params.source!, params.target!, eds)) {
          return eds;
        }

        const isIteration = params.source === 'start' && iterateFlow;
        const color = isIteration ? '#059669' : '#2563eb';
        
        return addEdge({ 
          ...params, 
          type: 'step', // 'step' type creates the orthogonal L-shaped lines
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: { 
            stroke: color, 
            strokeWidth: 2, 
            strokeDasharray: isIteration ? '5,5' : '0' 
          }
        }, eds);
      });
    },
    [setEdges, iterateFlow, validateConnections]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const addNode = (type: StepType) => {
    const id = `node-${nodes.length + 1}-${Date.now()}`;
    // Find highest sequence order to append to end
    const maxOrder = nodes.reduce((max, n) => Math.max(max, n.data.sequence_order), 0);
    
    const newNode: Node<FlowNodeData> = {
      id,
      type: 'custom',
      position: { x: 0, y: 0 }, // Position handled by useEffect
      data: {
        label: `New ${type.toUpperCase()} Step`,
        type,
        sequence_order: maxOrder + 1,
        value: '',
      },
      draggable: false
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  const deleteSelected = () => {
    if (selectedNodeId && selectedNodeId !== 'start') {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const updateNodeData = (id: string, newData: Partial<FlowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const handleGlobalUpdate = (key: string, value: any) => {
    if (key === 'flowName') setFlowName(value);
    if (key === 'iterateFlow') setIterateFlow(value);
    if (key === 'getIterateList') setGetIterateList(value);
  };

  const handleExport = () => {
    const result = generateFlowJson(nodes, edges, {
      flowName,
      iterateFlow,
      getIterateList,
    });
    setGeneratedResult(result);
    setShowJson(true);
  };

  // --- Import Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const restored = restoreFlowFromJson(json);
        
        // Update State
        setNodes(restored.nodes);
        setEdges(restored.edges);
        setFlowName(restored.flowName);
        setIterateFlow(restored.iterateFlow);
        setGetIterateList(restored.getIterateList);
        
        // Reset Selection
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        
      } catch (error) {
        console.error("Failed to parse flow JSON:", error);
        alert("Invalid JSON file. Please upload a valid flow export.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  // Delete key listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId]);

  const selectedNode = useMemo(() => 
    nodes.find((n) => n.id === selectedNodeId)?.data || null, 
  [nodes, selectedNodeId]);

  // Edges visualization (Apply Red color if needed)
  const visibleEdges = useMemo(() => {
    return edges.map(edge => {
      const isStartEdge = edge.source === 'start';
      let color = '#2563eb'; // Default blue
      let strokeDasharray = '0';

      if (isStartEdge) {
        if (!isStartConfigurationValid) {
           color = '#ef4444'; // Red (Error)
        } else if (iterateFlow) {
           color = '#059669'; // Emerald (Iteration)
           strokeDasharray = '5,5';
        }
      }
      
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: color,
          strokeDasharray
        },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });
  }, [edges, iterateFlow, isStartConfigurationValid]);

  // Determine connected predecessor nodes for variable generation
  const selectedNodeDependencies = useMemo(() => {
    if (!selectedNodeId || !nodes) return { steps: [], isStartConnected: false };
    
    // 1. Find edges connected TO the selected node
    const incomingEdges = edges.filter(e => e.target === selectedNodeId);
    
    // 2. Get the source node IDs
    const sourceIds = incomingEdges.map(e => e.source);
    
    // 3. Filter nodes list to find those sources
    const steps = nodes
      .filter(n => sourceIds.includes(n.id) && !n.data.isStartNode)
      .map(n => ({
        id: n.id,
        sequence: n.data.sequence_order,
        label: n.data.label
      }))
      .sort((a, b) => a.sequence - b.sequence);
      
    const isStartConnected = sourceIds.includes('start');

    return { steps, isStartConnected };
  }, [selectedNodeId, nodes, edges]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
      
      {/* --- Main Canvas Area --- */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">{flowName}</h1>
              <p className="text-xs text-slate-500">v1.0 • {iterateFlow ? 'Iterated Flow' : 'Simple Flow'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Validation Indicators */}
            {flowWarnings.length === 1 && (
               <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold animate-pulse">
                <AlertTriangle size={14} />
                {flowWarnings[0]}
              </div>
            )}
            
            {flowWarnings.length > 1 && (
              <>
                <button 
                  onClick={() => setShowWarningList(!showWarningList)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold animate-pulse hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle size={14} />
                  {flowWarnings.length} Warnings Detected ({flowWarnings.length})
                </button>
                
                {showWarningList && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowWarningList(false)}></div>
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4 animate-fadeIn">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                          <h3 className="text-xs font-bold text-slate-500 uppercase">Warning List</h3>
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{flowWarnings.length}</span>
                        </div>
                        <ul className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                           {flowWarnings.map((w, idx) => (
                              <li key={idx} className="text-xs text-red-600 flex items-start gap-2 leading-relaxed">
                                 <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                 <span>{w}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                   </>
                )}
              </>
            )}
            
            {/* Success Indicator - Constant when valid */}
            {isValidFlow && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-sm font-bold shadow-sm animate-fadeIn">
                <CheckCircle size={16} className="text-emerald-600" />
                Valid Flow
              </div>
            )}

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <button 
              onClick={handleImportClick}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md text-sm font-medium transition shadow-sm"
            >
              <Upload size={16} /> Import
            </button>
            
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-md text-sm font-medium transition shadow-sm"
            >
              <Download size={16} /> Export JSON
            </button>
          </div>
        </div>

        {/* Graph */}
        <div className="flex-1 relative">
           <ReactFlow
            nodes={nodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#f8fafc" gap={24} />
            <Controls className="!bg-white !border-slate-200 !shadow-sm" />
          </ReactFlow>

          {/* Floating Action Bar */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow-lg z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1">Add Step</span>
            <button onClick={() => addNode(StepType.SQL)} className="p-2 hover:bg-blue-50 text-blue-600 rounded flex items-center gap-2 text-xs font-semibold" title="Add SQL Step">
              <Plus size={14} /> SQL
            </button>
            <button onClick={() => addNode(StepType.LLM)} className="p-2 hover:bg-purple-50 text-purple-600 rounded flex items-center gap-2 text-xs font-semibold" title="Add LLM Step">
              <Plus size={14} /> LLM
            </button>
            <button onClick={() => addNode(StepType.CONCAT)} className="p-2 hover:bg-amber-50 text-amber-600 rounded flex items-center gap-2 text-xs font-semibold" title="Add Concat Step">
              <Plus size={14} /> Concat
            </button>
            
            {((selectedNodeId && selectedNodeId !== 'start') || selectedEdgeId) && (
              <>
                <div className="h-px bg-slate-200 my-1"></div>
                <button onClick={deleteSelected} className="p-2 hover:bg-red-50 text-red-500 rounded flex items-center gap-2 text-xs font-semibold" title="Delete Selected">
                  {selectedEdgeId ? <Unplug size={14} /> : <Trash2 size={14} />} 
                  {selectedEdgeId ? 'Disconnect' : 'Delete'}
                </button>
              </>
            )}
            
            {/* Legend */}
            <div className="h-px bg-slate-200 my-1"></div>
            <div className="px-2 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-0.5 bg-emerald-600 border-t border-dashed"></div>
                  <span className="text-[10px] text-slate-500">Iteration (if enabled)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-blue-600"></div>
                  <span className="text-[10px] text-slate-500">Step Connection</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Sidebar --- */}
      <Sidebar 
        nodeId={selectedNodeId}
        data={selectedNode} 
        onUpdate={updateNodeData}
        globalConfig={{ flowName, iterateFlow, getIterateList }} 
        onGlobalUpdate={handleGlobalUpdate}
        availablePredecessors={selectedNodeDependencies.steps}
        isStartConnected={selectedNodeDependencies.isStartConnected}
      />

      {/* --- Modals --- */}
      <JsonPreview 
        isOpen={showJson} 
        onClose={() => setShowJson(false)} 
        jsonData={generatedResult.json} 
      />

    </div>
  );
}
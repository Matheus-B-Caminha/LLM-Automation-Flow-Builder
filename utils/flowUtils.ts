import { Node, Edge, MarkerType } from 'reactflow';
import { FlowJson, FlowNodeData, StepType, TimeGrain, TimeMode } from '../src/types';

export const generateFlowJson = (
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  globalConfig: {
    iterateFlow: boolean;
    getIterateList: string;
    flowName: string;
  }
): { json: FlowJson } => {
  
  // Filter out the start node (it's configuration only)
  const stepNodes = nodes.filter(n => !n.data.isStartNode);
  
  // Sort by sequence order
  const sortedSteps = [...stepNodes].sort((a, b) => a.data.sequence_order - b.data.sequence_order);

  // LOGIC:
  // iterable_steps = IDs (sequence orders) of steps connected directly from Start Node.
  
  // Find iterable steps
  const iterableStepIds = new Set<string>();
  edges.forEach(edge => {
    if (edge.source === 'start') {
      iterableStepIds.add(edge.target);
    }
  });
  
  const iterable_steps = globalConfig.iterateFlow 
    ? sortedSteps
        .filter(n => iterableStepIds.has(n.id))
        .map(n => n.data.sequence_order)
    : undefined;


  const steps = sortedSteps.map(node => {
    // Find dependencies: edges where target is this node, but source is NOT start node
    const incomingDependencyEdges = edges.filter(e => e.target === node.id && e.source !== 'start');
    const sourceNodeIds = incomingDependencyEdges.map(e => e.source);
    
    // Convert source Node IDs to their sequence_order
    const dependsOnOrders = nodes
      .filter(n => sourceNodeIds.includes(n.id) && !n.data.isStartNode)
      .map(n => n.data.sequence_order)
      .sort((a, b) => a - b)
      .join(',');

    const stepJson: any = {
      sequence_order: node.data.sequence_order,
      sequence_name: node.data.label,
      type: node.data.type || StepType.SQL,
      value: node.data.value,
    };

    if (dependsOnOrders) {
      stepJson.depends_on = dependsOnOrders;
    }

    if (node.data.max_retry) {
      stepJson.max_retry = node.data.max_retry;
    }

    // SQL Props
    if (node.data.type === StepType.SQL) {
      if (node.data.append_iteration_column) stepJson.append_iteration_column = node.data.append_iteration_column;
      if (node.data.append_time_column) {
        stepJson.append_time_column = node.data.append_time_column;
        
        // Construct time_range from amount + grain
        if (node.data.time_amount && node.data.time_grain) {
           stepJson.time_range = `last_${node.data.time_amount}_${node.data.time_grain}s`; // e.g. last_7_days
        }
        
        if (node.data.time_grain) stepJson.time_grain = node.data.time_grain;
        if (node.data.time_mode) stepJson.time_mode = node.data.time_mode;
      }
      if (node.data.reference_date) stepJson.reference_date = node.data.reference_date;
    }

    // LLM Props
    if (node.data.type === StepType.LLM && node.data.llm_model) {
      stepJson.llm_model = node.data.llm_model;
    }

    return stepJson;
  });

  const finalJson: FlowJson = {
    flow_name: globalConfig.flowName,
    iterate_flow: globalConfig.iterateFlow,
    steps: steps
  };

  if (globalConfig.iterateFlow) {
    finalJson.iterable_steps = iterable_steps;
    finalJson.get_iterate_list = globalConfig.getIterateList;
  }

  return { json: finalJson };
};

/**
 * Reconstructs the React Flow state (nodes, edges, global config) from an imported JSON object.
 */
export const restoreFlowFromJson = (json: FlowJson) => {
  const newNodes: Node<FlowNodeData>[] = [];
  const newEdges: Edge[] = [];

  // 1. Rebuild Start Node
  newNodes.push({
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
  });

  // Maps sequence_order to nodeID for building edges
  const sequenceToIdMap: Record<number, string> = {};

  // 2. Rebuild Step Nodes
  if (Array.isArray(json.steps)) {
    json.steps.forEach((step) => {
      const id = `node-${step.sequence_order}-${Date.now() + Math.random()}`;
      sequenceToIdMap[step.sequence_order] = id;

      // Parse time range back to amount/grain (e.g. "last_7_days")
      let time_amount: number | undefined;
      let time_grain: TimeGrain | undefined;

      if (step.time_range) {
        const parts = step.time_range.split('_');
        // Expected format: last_X_Y or last_X_Ys
        if (parts.length >= 3) {
          const amountStr = parts[1];
          let grainStr = parts[2];
          if (grainStr.endsWith('s')) grainStr = grainStr.slice(0, -1); // remove plural 's'
          
          time_amount = parseInt(amountStr, 10);
          // @ts-ignore - simplified matching
          if (Object.values(TimeGrain).includes(grainStr)) {
            time_grain = grainStr as TimeGrain;
          }
        }
      } else {
        // Fallback if stored separately (though export combines them)
        if (step.time_grain) time_grain = step.time_grain as TimeGrain;
      }

      const nodeData: FlowNodeData = {
        label: step.sequence_name || `Step ${step.sequence_order}`,
        sequence_order: step.sequence_order,
        type: step.type as StepType,
        value: step.value || '',
        
        // SQL
        append_iteration_column: step.append_iteration_column,
        append_time_column: step.append_time_column,
        time_amount,
        time_grain,
        time_mode: step.time_mode as TimeMode,
        reference_date: step.reference_date,

        // LLM
        llm_model: step.llm_model,
        max_retry: step.max_retry
      };

      newNodes.push({
        id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Position will be handled by auto-layout in App.tsx
        data: nodeData,
        draggable: false
      });
    });
  }

  // 3. Rebuild Edges
  
  // A. Iteration Edges (Start -> Step)
  if (json.iterate_flow && json.iterable_steps) {
    json.iterable_steps.forEach((seq) => {
      const targetId = sequenceToIdMap[seq];
      if (targetId) {
        newEdges.push({
          id: `edge-start-${targetId}`,
          source: 'start',
          target: targetId,
          type: 'step',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' },
          style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' }
        });
      }
    });
  }

  // B. Dependency Edges (Step -> Step) & Standard Flow
  if (Array.isArray(json.steps)) {
    json.steps.forEach((step) => {
      const targetId = sequenceToIdMap[step.sequence_order];
      
      if (step.depends_on) {
        // Explicit dependencies from JSON
        let sources: number[] = [];
        
        // Cast to any to avoid TypeScript narrowing to 'never' for array/number checks
        // as the FlowStep interface defines depends_on as strictly string | undefined
        const dep = step.depends_on as any;

        // Handle various formats: string "1,2", number 1, or number/string arrays
        if (typeof dep === 'string') {
          sources = dep.split(',').map((s: string) => parseInt(s.trim(), 10));
        } else if (typeof dep === 'number') {
          sources = [dep];
        } else if (Array.isArray(dep)) {
          sources = dep.map((s: any) => parseInt(String(s), 10));
        }

        sources.forEach(sourceSeq => {
          const sourceId = sequenceToIdMap[sourceSeq];
          if (sourceId && targetId) {
            newEdges.push({
              id: `edge-${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              type: 'step',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
              style: { stroke: '#2563eb', strokeWidth: 2 }
            });
          }
        });
      } else {
        // No explicit dependency? 
        // Logic: If it's the first step (seq 1), check if we need to connect to Start (if not iterated).
        // If it's > 1, assume linear flow from previous step (seq - 1).
        
        if (step.sequence_order === 1) {
           // Only connect to Start if it wasn't already connected via iteration logic
           const isIterated = json.iterate_flow && json.iterable_steps?.includes(1);
           if (!isIterated) {
             newEdges.push({
                id: `edge-start-${targetId}`,
                source: 'start',
                target: targetId,
                type: 'step',
                markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
                style: { stroke: '#2563eb', strokeWidth: 2 }
             });
           }
        } else {
           // Try to connect from previous sequence number
           const prevSeq = step.sequence_order - 1;
           const sourceId = sequenceToIdMap[prevSeq];
           if (sourceId && targetId) {
             newEdges.push({
                id: `edge-${sourceId}-${targetId}`,
                source: sourceId,
                target: targetId,
                type: 'step',
                markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
                style: { stroke: '#2563eb', strokeWidth: 2 }
             });
           }
        }
      }
    });
  }

  return {
    nodes: newNodes,
    edges: newEdges,
    flowName: json.flow_name || 'Imported Flow',
    iterateFlow: json.iterate_flow || false,
    getIterateList: json.get_iterate_list || ''
  };
};

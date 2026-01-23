import { Node, Edge } from 'reactflow';

// --- Enums based on PDF ---

export enum StepType {
  SQL = 'sql',
  LLM = 'llm',
  CONCAT = 'concat',
}

export enum TimeGrain {
  MONTH = 'month',
  DAY = 'day',
}

export enum TimeMode {
  CLOSED_OPEN = 'closed_open',
  CLOSED_CLOSED = 'closed_closed',
  OPEN_CLOSED = 'open_closed',
  OPEN_OPEN = 'open_open',
}

// --- Internal React Flow Data Models ---

export interface FlowNodeData {
  label: string;
  sequence_order: number;
  type?: StepType;
  
  // Content
  value: string;
  
  // SQL Specific
  append_iteration_column?: string;
  append_time_column?: string;
  
  // Split time configuration
  time_amount?: number; // User input number
  time_grain?: TimeGrain; // User select grain
  
  time_mode?: TimeMode;
  reference_date?: string; // YYYY-MM
  
  // LLM Specific
  llm_model?: string;
  
  // Common
  max_retry?: number;
  
  // Iteration Logic (Only for Start Node conceptually, but stored globally or in special node)
  isStartNode?: boolean;

  // Validation UI State
  hasError?: boolean;
}

// --- Output JSON Models ---

export interface FlowStep {
  sequence_order: number;
  sequence_name: string;
  type: StepType;
  value: string;
  depends_on?: string; // "1,2"
  max_retry?: number;
  
  // SQL
  append_iteration_column?: string;
  append_time_column?: string;
  time_range?: string; // Constructed string
  time_grain?: string;
  time_mode?: string;
  reference_date?: string;
  
  // LLM
  llm_model?: string;
}

export interface DeliveryConfig {
  method: string;
  recipients: string[];
  iteration_names: string[];
}

// Revised Flow JSON based on user request (Scrapped wrapper)
export interface FlowJson {
  flow_name: string;
  iterate_flow: boolean;
  iterable_steps?: number[];
  get_iterate_list?: string;
  steps: FlowStep[];
  delivery_config?: DeliveryConfig[];
}
import { StepType, TimeGrain, TimeMode } from './types';

export const INITIAL_FLOW_NAME = "My New Automation";
export const INITIAL_VERSION = "1.0";

export const STEP_TYPES = [
  { value: StepType.SQL, label: 'SQL Query' },
  { value: StepType.LLM, label: 'LLM Analysis' },
  { value: StepType.CONCAT, label: 'Concatenation / Formatting' },
];

export const TIME_GRAINS = Object.values(TimeGrain).map((v) => ({ value: v, label: v }));
export const TIME_MODES = Object.values(TimeMode).map((v) => ({ value: v, label: v }));

export const DEFAULT_LLM_MODEL = "nvidia/nemotron-nano-9b-v2:free";
export const ADVANCED_LLM_MODEL = "anthropic/claude-3-5-sonnet";

export const PLACEHOLDERS = [
  { label: '{{iteration_value}}', desc: 'Current iteration value (e.g. Consultant Name)' },
  { label: '{{step_N}}', desc: 'Output of Step N (e.g., {{step_1}})' },
  { label: '{{sequence_name}}', desc: 'Refer to step by name' },
];
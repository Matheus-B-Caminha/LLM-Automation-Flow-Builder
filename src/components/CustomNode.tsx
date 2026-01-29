import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Bot, FileText, Play, AlertCircle } from 'lucide-react';
import { StepType, FlowNodeData } from '../src/types';

const CustomNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const isStart = data.isStartNode;
  const hasError = data.hasError;

  let Icon = FileText;
  let bgColor = "bg-white";
  let borderColor = "border-slate-200";
  let iconColor = "text-slate-500";
  let badge = "";

  // Error state takes precedence for visual feedback
  if (hasError) {
    bgColor = "bg-red-50";
    borderColor = "border-red-500";
    iconColor = "text-red-500";
  } else if (isStart) {
    Icon = Play;
    bgColor = "bg-emerald-50";
    borderColor = "border-emerald-300";
    iconColor = "text-emerald-600";
    badge = "Global Config";
  } else {
    switch (data.type) {
      case StepType.SQL:
        Icon = Database;
        bgColor = "bg-blue-50";
        borderColor = "border-blue-300";
        iconColor = "text-blue-600";
        badge = "SQL";
        break;
      case StepType.LLM:
        Icon = Bot;
        bgColor = "bg-purple-50";
        borderColor = "border-purple-300";
        iconColor = "text-purple-600";
        badge = "LLM";
        break;
      case StepType.CONCAT:
        Icon = FileText;
        bgColor = "bg-amber-50";
        borderColor = "border-amber-300";
        iconColor = "text-amber-600";
        badge = "Concat";
        break;
    }
  }

  return (
    <div
      className={`relative rounded-lg border-2 shadow-sm transition-all w-64 ${bgColor} ${borderColor} ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
    >
      {/* Input Handle - On the LEFT for Stair/Ladder view */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-slate-400 !w-3 !h-3 !-left-2"
        />
      )}

      {/* Error Badge */}
      {hasError && (
        <div className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full shadow-md z-10 animate-bounce">
          <AlertCircle size={16} />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-md bg-white shadow-sm ${iconColor}`}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">
              {isStart ? "Start / Config" : `${data.sequence_order}. ${data.label}`}
            </h3>
            <span className={`text-xs font-medium uppercase tracking-wider ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
              {hasError ? "Sequence Conflict" : badge}
            </span>
          </div>
        </div>

        {!isStart && (
           <div className="text-xs text-slate-500 line-clamp-2 bg-white/50 p-1 rounded font-mono">
             {data.value || "(No content)"}
           </div>
        )}
      </div>

      {/* Output Handle - On the BOTTOM for Stair/Ladder view */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-3 !h-3 !-bottom-2"
      />
    </div>
  );
};

export default memo(CustomNode);
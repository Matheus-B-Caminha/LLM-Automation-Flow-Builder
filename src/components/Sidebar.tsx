import React, { useState, useMemo } from 'react';
import { FlowNodeData, StepType } from '../types';
import { STEP_TYPES, TIME_GRAINS, TIME_MODES, DEFAULT_LLM_MODEL, PLACEHOLDERS } from '../constants';
import { Info, AlertCircle, Copy, Check, AlertTriangle } from 'lucide-react';

interface SidebarProps {
  nodeId: string | null;
  data: FlowNodeData | null;
  onUpdate: (id: string, newData: Partial<FlowNodeData>) => void;
  // Global props for Start Node
  globalConfig: {
    iterateFlow: boolean;
    getIterateList: string;
    flowName: string;
  };
  onGlobalUpdate: (key: string, value: any) => void;
  // Available connected nodes for creating dynamic variables
  availablePredecessors: { id: string; sequence: number; label: string }[];
  isStartConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  nodeId, 
  data, 
  onUpdate, 
  globalConfig, 
  onGlobalUpdate,
  availablePredecessors,
  isStartConnected
}) => {
  const [copied, setCopied] = useState(false);

  // --- HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURN (Fix for Error #310) ---

  const isStart = data?.isStartNode;
  const dataValue = data?.value;
  const dataType = data?.type;
  
  // Validation Logic for Step Value
  const invalidPlaceholders = useMemo(() => {
    // If data is missing, return empty array (hooks must still run)
    if (!data || isStart || !dataValue) return [];
    
    const regex = /\{\{(.*?)\}\}/g;
    const matches = [...dataValue.matchAll(regex)].map(m => m[1]);
    const errors: string[] = [];

    matches.forEach(tag => {
      if (tag === 'iteration_value') {
        if (!globalConfig.iterateFlow || !isStartConnected) {
          errors.push(`{{${tag}}} (Not connected to iteration)`);
        }
        return;
      }
      
      if (tag.startsWith('step_')) {
         const stepNum = parseInt(tag.replace('step_', ''), 10);
         const found = availablePredecessors.some(p => p.sequence === stepNum);
         if (!found) {
            errors.push(`{{${tag}}} (Step ${stepNum} not connected)`);
         }
         return;
      }
    });

    return [...new Set(errors)];
  }, [dataValue, isStart, globalConfig.iterateFlow, isStartConnected, availablePredecessors, data]);

  // --- EARLY RETURN ---
  if (!nodeId || !data) {
    return (
      <div className="w-96 border-l border-slate-300 bg-white h-full p-6 flex items-center justify-center text-slate-500 text-sm font-medium">
        Select a node to edit properties
      </div>
    );
  }

  // --- RENDER LOGIC ---

  const handleChange = (key: keyof FlowNodeData, value: any) => {
    onUpdate(nodeId, { [key]: value });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const llmModelValue = data.llm_model !== undefined ? data.llm_model : DEFAULT_LLM_MODEL;

  const isSqlEmpty = dataType === StepType.SQL && (!dataValue || !dataValue.trim());
  const isTimeConfigIncomplete = dataType === StepType.SQL && data.append_time_column && (!data.time_amount || !data.time_grain || !data.time_mode);

  return (
    <div className="w-96 border-l border-slate-300 bg-white h-full flex flex-col overflow-hidden shadow-lg z-20">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-bold text-slate-900 text-lg">
          {isStart ? 'Global Configuration' : 'Step Properties'}
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          {isStart ? 'Define flow metadata & iteration' : `Editing Step #${data.sequence_order}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* ================= START NODE CONFIG ================= */}
        {isStart && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Flow Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={globalConfig.flowName}
                onChange={(e) => onGlobalUpdate('flowName', e.target.value)}
              />
            </div>

            {/* Iteration Configuration Box */}
            <div className={`p-4 rounded-lg border space-y-4 transition-colors ${
              globalConfig.iterateFlow && !globalConfig.getIterateList 
                ? 'bg-red-50 border-red-300' 
                : 'bg-slate-100 border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-bold ${globalConfig.iterateFlow && !globalConfig.getIterateList ? 'text-red-800' : 'text-slate-800'}`}>Iterate Flow?</label>
                <input
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                  checked={globalConfig.iterateFlow}
                  onChange={(e) => onGlobalUpdate('iterateFlow', e.target.checked)}
                />
              </div>
              
              <div className={`space-y-2 transition-all ${globalConfig.iterateFlow ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="space-y-1">
                   <label className="block text-xs font-bold text-slate-700 uppercase">Iteration Query (SQL)</label>
                   <p className="text-[10px] text-slate-600 font-medium">Must return a single column.</p>
                </div>
                <textarea
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md text-xs font-mono outline-none ${
                     globalConfig.iterateFlow && !globalConfig.getIterateList
                     ? 'border-red-400 bg-white text-red-900 focus:ring-red-500'
                     : 'border-slate-400 bg-white text-slate-900 focus:ring-blue-500'
                  }`}
                  value={globalConfig.getIterateList}
                  onChange={(e) => onGlobalUpdate('getIterateList', e.target.value)}
                  placeholder="SELECT DISTINCT id FROM users WHERE active = 1"
                />
                {globalConfig.iterateFlow && !globalConfig.getIterateList && (
                  <div className="flex items-center gap-1 text-xs text-red-600 font-bold">
                    <AlertCircle size={12} />
                    <span>Iteration query is required when enabled.</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================= NORMAL STEP CONFIG ================= */}
        {!isStart && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <label className="block text-sm font-bold text-slate-800">Step Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={data.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">Seq. #</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={data.sequence_order}
                  onChange={(e) => handleChange('sequence_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Type</label>
              <select
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={data.type}
                onChange={(e) => handleChange('type', e.target.value as StepType)}
              >
                {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className={`space-y-2 ${(invalidPlaceholders.length > 0 || isSqlEmpty) ? 'p-2 bg-red-50 rounded-md border border-red-100' : ''}`}>
              <label className="block text-sm font-bold text-slate-800 flex justify-between">
                <span>Value (Query/Prompt)</span>
                {data.type !== StepType.SQL && (
                  <button onClick={() => copyToClipboard(data.value)} className="text-slate-500 hover:text-blue-600 transition">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </label>
              <textarea
                rows={8}
                className={`w-full px-3 py-2 border rounded-md text-sm font-mono outline-none resize-y transition-all ${
                   invalidPlaceholders.length > 0
                   ? 'border-red-500 border-dashed text-slate-900 bg-white focus:ring-2 focus:ring-red-500'
                   : isSqlEmpty 
                      ? 'border-red-400 text-slate-900 bg-white focus:ring-2 focus:ring-red-500'
                      : 'border-slate-400 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500'
                }`}
                value={data.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder={data.type === StepType.SQL ? "SELECT * FROM..." : "Enter prompt or template..."}
              />
              
              {/* Validation Warnings */}
              {isSqlEmpty && (
                 <div className="flex items-center gap-1 text-xs text-red-600 font-bold mt-1">
                   <AlertCircle size={12} />
                   <span>SQL Query cannot be empty.</span>
                 </div>
              )}
              {invalidPlaceholders.length > 0 && (
                <div className="mt-1 space-y-1">
                   {invalidPlaceholders.map((err, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs text-red-600 font-bold">
                        <AlertTriangle size={12} />
                        <span>Unavailable variable: {err}</span>
                      </div>
                   ))}
                </div>
              )}

              {data.type !== StepType.SQL && (
                 <div className="flex flex-col gap-2 pt-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Available Variables</span>
                   <div className="flex flex-wrap gap-2">
                     {/* Show iteration value ONLY if connected to iteration start */}
                     {globalConfig.iterateFlow && isStartConnected && (
                       <button
                          onClick={() => handleChange('value', data.value + '{{iteration_value}}')}
                          className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2 py-1.5 rounded border border-emerald-200 transition flex items-center gap-1"
                          title="Current Iteration Value"
                       >
                         {'{{iteration_value}}'}
                       </button>
                     )}
                     
                     {availablePredecessors.map(p => (
                       <button
                          key={p.id}
                          onClick={() => handleChange('value', data.value + `{{step_${p.sequence}}}`)}
                          className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1.5 rounded border border-blue-200 transition flex items-center gap-1"
                          title={`From: ${p.label}`}
                       >
                         <span>{`{{step_${p.sequence}}}`}</span>
                         <span className="opacity-60 font-normal border-l border-blue-200 pl-1 ml-1">{p.label}</span>
                       </button>
                     ))}

                     {availablePredecessors.length === 0 && (!globalConfig.iterateFlow || !isStartConnected) && (
                        <span className="text-[10px] text-slate-400 italic">Connect steps to see variables.</span>
                     )}
                   </div>
                 </div>
              )}
            </div>

            {/* SQL Specifics */}
            {data.type === StepType.SQL && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide border-b border-blue-200 pb-2">SQL Configuration</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Iteration Column (Where clause)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g. consultor_id"
                      value={data.append_iteration_column || ''}
                      onChange={(e) => handleChange('append_iteration_column', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Time Column</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g. created_at"
                      value={data.append_time_column || ''}
                      onChange={(e) => handleChange('append_time_column', e.target.value)}
                    />
                  </div>
                </div>

                {data.append_time_column && (
                  <div className={`space-y-3 pt-2 ${isTimeConfigIncomplete ? 'p-2 rounded border border-red-500 border-dashed bg-red-50' : ''}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Range Amount</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="e.g. 7"
                          value={data.time_amount || ''}
                          onChange={(e) => handleChange('time_amount', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Range Grain</label>
                        <select
                          className="w-full px-2 py-1.5 border border-slate-400 rounded text-xs text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          value={data.time_grain || ''}
                          onChange={(e) => handleChange('time_grain', e.target.value)}
                        >
                           <option value="">Select...</option>
                          {TIME_GRAINS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mode</label>
                        <select
                          className="w-full px-2 py-1.5 border border-slate-400 rounded text-xs text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          value={data.time_mode || ''}
                          onChange={(e) => handleChange('time_mode', e.target.value)}
                        >
                          <option value="">Select Mode...</option>
                          {TIME_MODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {isTimeConfigIncomplete && (
                       <div className="flex items-center gap-1 text-xs text-red-600 font-bold">
                         <AlertTriangle size={12} />
                         <span>Complete all time fields (Amount, Grain, Mode).</span>
                       </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LLM Specifics */}
            {data.type === StepType.LLM && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wide border-b border-purple-200 pb-2">AI Configuration</h3>
                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                      placeholder={DEFAULT_LLM_MODEL}
                      value={llmModelValue}
                      onChange={(e) => handleChange('llm_model', e.target.value)}
                    />
                    <p className="text-[10px] text-slate-600 mt-1 font-medium">Default: {DEFAULT_LLM_MODEL}</p>
                 </div>
              </div>
            )}

            {/* Errors / Validation Help */}
             {data.type === StepType.SQL && !data.value.toLowerCase().includes('select') && !isSqlEmpty && (
               <div className="flex items-start gap-2 p-2 bg-yellow-50 text-yellow-800 rounded text-xs border border-yellow-200">
                 <AlertCircle size={14} className="mt-0.5" />
                 <span>SQL Value usually starts with SELECT.</span>
               </div>
             )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
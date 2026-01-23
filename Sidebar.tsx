import React, { useEffect, useState } from 'react';
import { FlowNodeData, StepType } from '../types';
import { STEP_TYPES, TIME_GRAINS, TIME_MODES, DEFAULT_LLM_MODEL, PLACEHOLDERS } from '../constants';
import { Info, AlertCircle, Copy, Check } from 'lucide-react';

interface SidebarProps {
  nodeId: string | null;
  data: FlowNodeData | null;
  onUpdate: (id: string, newData: Partial<FlowNodeData>) => void;
  // Global props for Start Node
  globalConfig: {
    iterateFlow: boolean;
    getIterateList: string;
    flowName: string;
    cron: string;
  };
  onGlobalUpdate: (key: string, value: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ nodeId, data, onUpdate, globalConfig, onGlobalUpdate }) => {
  const [copied, setCopied] = useState(false);

  if (!nodeId || !data) {
    return (
      <div className="w-96 border-l border-slate-300 bg-white h-full p-6 flex items-center justify-center text-slate-500 text-sm font-medium">
        Select a node to edit properties
      </div>
    );
  }

  const isStart = data.isStartNode;

  const handleChange = (key: keyof FlowNodeData, value: any) => {
    onUpdate(nodeId, { [key]: value });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ensure LLM model has a value if undefined, so input is controlled/editable
  const llmModelValue = data.llm_model !== undefined ? data.llm_model : DEFAULT_LLM_MODEL;

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
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={globalConfig.flowName}
                onChange={(e) => onGlobalUpdate('flowName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Frequency (Cron)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={globalConfig.cron}
                onChange={(e) => onGlobalUpdate('cron', e.target.value)}
                placeholder="0 8 * * *"
              />
              <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-semibold">
                <Info size={12} /> Test Cron Expression
              </a>
            </div>

            <div className="p-4 bg-slate-100 rounded-lg border border-slate-300 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800">Iterate Flow?</label>
                <input
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                  checked={globalConfig.iterateFlow}
                  onChange={(e) => onGlobalUpdate('iterateFlow', e.target.checked)}
                />
              </div>
              
              {globalConfig.iterateFlow && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Iteration Query (SQL)</label>
                  <p className="text-[10px] text-slate-600 font-medium">Must return a single column.</p>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-400 rounded-md text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={globalConfig.getIterateList}
                    onChange={(e) => onGlobalUpdate('getIterateList', e.target.value)}
                    placeholder="SELECT DISTINCT id FROM users WHERE active = 1"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= NORMAL STEP CONFIG ================= */}
        {!isStart && (
          <>
            {/* Common Fields */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Step Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={data.label}
                onChange={(e) => handleChange('label', e.target.value)}
              />
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

            <div className="space-y-2">
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
                className="w-full px-3 py-2 border border-slate-400 rounded-md text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y transition-all"
                value={data.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder={data.type === StepType.SQL ? "SELECT * FROM..." : "Enter prompt or template..."}
              />
              {data.type !== StepType.SQL && (
                 <div className="flex flex-wrap gap-2 pt-1">
                   {PLACEHOLDERS.map(p => (
                     <button
                        key={p.label}
                        onClick={() => handleChange('value', data.value + p.label)}
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded border border-slate-300 transition"
                        title={p.desc}
                     >
                       {p.label}
                     </button>
                   ))}
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
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g. consultor_id"
                      value={data.append_iteration_column || ''}
                      onChange={(e) => handleChange('append_iteration_column', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Time Column</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g. created_at"
                      value={data.append_time_column || ''}
                      onChange={(e) => handleChange('append_time_column', e.target.value)}
                    />
                  </div>
                </div>

                {data.append_time_column && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Range Amount</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                          value={data.time_mode || 'closed_open'}
                          onChange={(e) => handleChange('time_mode', e.target.value)}
                        >
                          {TIME_MODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                  </>
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
                      className="w-full px-2 py-1.5 border border-slate-400 rounded text-sm text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                      placeholder={DEFAULT_LLM_MODEL}
                      value={llmModelValue}
                      onChange={(e) => handleChange('llm_model', e.target.value)}
                    />
                    <p className="text-[10px] text-slate-600 mt-1 font-medium">Default: {DEFAULT_LLM_MODEL}</p>
                 </div>
              </div>
            )}

            {/* Errors / Validation Help */}
             {data.type === StepType.SQL && !data.value.toLowerCase().includes('select') && (
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
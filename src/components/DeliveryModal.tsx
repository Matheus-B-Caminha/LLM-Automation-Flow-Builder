import React, { useState } from 'react';
import { X, Plus, Trash2, Mail } from 'lucide-react';
import { DeliveryConfig } from '../src/types';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryConfig: DeliveryConfig[];
  setDeliveryConfig: (config: DeliveryConfig[]) => void;
  flowName: string;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, deliveryConfig, setDeliveryConfig, flowName }) => {
  const [tempConfig, setTempConfig] = useState<DeliveryConfig[]>(deliveryConfig);

  // Sync state when opening
  React.useEffect(() => {
    if (isOpen) setTempConfig(deliveryConfig);
  }, [isOpen, deliveryConfig]);

  if (!isOpen) return null;

  const addRule = () => {
    setTempConfig([
      ...tempConfig,
      { method: 'email', recipients: [], iteration_names: [] }
    ]);
  };

  const removeRule = (idx: number) => {
    setTempConfig(tempConfig.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: keyof DeliveryConfig, value: any) => {
    const newConfig = [...tempConfig];
    newConfig[idx] = { ...newConfig[idx], [field]: value };
    setTempConfig(newConfig);
  };

  const handleArrayInput = (text: string): string[] => {
    return text.split(',').map(s => s.trim()).filter(s => s !== '');
  };

  const handleSave = () => {
    setDeliveryConfig(tempConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Delivery Configuration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-md border border-blue-100">
            Configure who receives the output. 
            <br />
            <strong>Iteration Names Format:</strong> <code>{flowName || "[Flow Name]"} - [Iteration Value]</code>
          </p>

          {tempConfig.map((rule, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50 relative group">
              <button 
                onClick={() => removeRule(idx)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Method</label>
                  <div className="flex items-center gap-2 text-sm text-slate-800 bg-white px-3 py-2 border rounded-md">
                    <Mail size={16} /> Email
                  </div>
                </div>
                
                <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Recipients</label>
                   <input
                     type="text"
                     className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-blue-500"
                     placeholder="email1@test.com, email2@test.com"
                     value={rule.recipients.join(', ')}
                     onChange={(e) => updateRule(idx, 'recipients', handleArrayInput(e.target.value))}
                   />
                   <p className="text-[10px] text-slate-400 mt-1">Comma separated emails</p>
                </div>

                <div className="md:col-span-2">
                   <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Iterations</label>
                   <textarea
                     rows={2}
                     className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-blue-500"
                     placeholder={`${flowName || "Flow"} - John Doe, ${flowName || "Flow"} - Region North`}
                     value={rule.iteration_names.join(', ')}
                     onChange={(e) => updateRule(idx, 'iteration_names', handleArrayInput(e.target.value))}
                   />
                   <p className="text-[10px] text-slate-400 mt-1">
                     Specific iteration names to match. Leave empty to potentially apply to all (logic depends on implementation).
                   </p>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRule}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2 font-medium"
          >
            <Plus size={18} /> Add Delivery Rule
          </button>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium">Save Configuration</button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
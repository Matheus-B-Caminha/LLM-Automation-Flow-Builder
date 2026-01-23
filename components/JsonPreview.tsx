import React, { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';

interface JsonPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: any;
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ isOpen, onClose, jsonData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const content = JSON.stringify(jsonData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fileName = `${jsonData.flow_name || 'flow'}.json`;
    const blob = new Blob([content], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-fadeInUp">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-4">
            <h2 className="text-lg font-bold text-slate-800">Generated Flow JSON</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 p-4">
          <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
            {content}
          </pre>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium">
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-md text-sm font-medium transition"
          >
             <Download size={16} /> Download .json
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonPreview;
import { useState, useRef, useEffect } from 'react';
import { useTaskSocket } from '../hooks/useTaskSocket.js';

interface TaskOutputPanelProps {
  taskId: string;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-slate-500', bg: 'bg-slate-100', icon: '⏳' },
  queued: { label: 'Queued', color: 'text-amber-600', bg: 'bg-amber-100', icon: '📋' },
  preparing: { label: 'Preparing', color: 'text-blue-600', bg: 'bg-blue-100', icon: '🔧' },
  running: { label: 'Running', color: 'text-info', bg: 'bg-blue-100', icon: '▶️' },
  awaiting_input: { label: 'Needs Input', color: 'text-warning', bg: 'bg-amber-100', icon: '💬' },
  completed: { label: 'Completed', color: 'text-success', bg: 'bg-green-100', icon: '✅' },
  failed: { label: 'Failed', color: 'text-error', bg: 'bg-red-100', icon: '❌' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-100', icon: '🚫' },
  timeout: { label: 'Timeout', color: 'text-warning', bg: 'bg-amber-100', icon: '⏰' },
};

export default function TaskOutputPanel({ taskId, onBack }: TaskOutputPanelProps) {
  const { status, output, interactivePrompt, isConnected, sendInput } = useTaskSocket(taskId);
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  const statusInfo = statusConfig[status] || statusConfig.pending;

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSendInput = () => {
    if (!inputText.trim()) return;
    sendInput(inputText);
    setInputText('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClear = () => {
    // Note: This only clears the local display, not the server state
    window.location.reload();
  };

  const isRunning = ['pending', 'queued', 'preparing', 'running', 'awaiting_input'].includes(status);
  const isDone = ['completed', 'failed', 'cancelled', 'timeout'].includes(status);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Task Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div>
              <h3 className="font-semibold text-slate-800">Task</h3>
              <span className="text-xs text-slate-400 font-mono">{taskId}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
              <span className="text-slate-500">{isConnected ? 'Live' : 'Reconnecting...'}</span>
            </div>

            {/* Task Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.color} ${statusInfo.bg}`}>
              <span>{statusInfo.icon}</span>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Progress Bar for running tasks */}
        {isRunning && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse"></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">{status === 'preparing' ? 'Creating container...' : status === 'running' ? 'Executing skill...' : 'Waiting...'}</p>
          </div>
        )}
      </div>

      {/* Output Area */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        {/* Terminal Header */}
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="ml-2 text-xs text-slate-400 font-mono">Output</span>
          </div>
          <div className="flex items-center gap-2">
            {output && (
              <>
                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Terminal Content */}
        <pre
          ref={outputRef}
          className="p-4 text-sm font-mono text-slate-300 min-h-[300px] max-h-[600px] overflow-auto whitespace-pre-wrap leading-relaxed"
        >
          {output || (
            <span className="text-slate-600 italic">Waiting for output...</span>
          )}
        </pre>
      </div>

      {/* Interactive Prompt */}
      {interactivePrompt && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💬</span>
            <h4 className="font-semibold text-amber-900">Claude needs your input</h4>
          </div>
          <p className="text-amber-800 mb-4 bg-amber-100/50 p-3 rounded-lg">{interactivePrompt}</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
              placeholder="Type your response..."
              className="flex-1 px-4 py-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              autoFocus
            />
            <button
              onClick={handleSendInput}
              disabled={!inputText.trim()}
              className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Result Actions */}
      {isDone && (
        <div className="flex justify-center gap-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            ← Back to Skills
          </button>
          {status === 'completed' && (
            <button
              onClick={handleCopy}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
            >
              📋 Copy Result
            </button>
          )}
        </div>
      )}
    </div>
  );
}

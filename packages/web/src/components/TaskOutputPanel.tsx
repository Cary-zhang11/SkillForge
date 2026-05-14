import { useState } from 'react';
import { useTaskSocket } from '../hooks/useTaskSocket.js';

interface TaskOutputPanelProps {
  taskId: string;
}

export default function TaskOutputPanel({ taskId }: TaskOutputPanelProps) {
  const { status, output, interactivePrompt, isConnected, sendInput } = useTaskSocket(taskId);
  const [inputText, setInputText] = useState('');

  const handleSendInput = () => {
    if (!inputText.trim()) return;
    sendInput(inputText);
    setInputText('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Task: {taskId}</h3>
        <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected' : 'Disconnected'} | State: {status}
        </span>
      </div>

      <pre
        style={{
          background: '#1a1a1a',
          color: '#f0f0f0',
          padding: '1rem',
          minHeight: '300px',
          maxHeight: '500px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {output || 'Waiting for output...'}
      </pre>

      {interactivePrompt && (
        <div style={{ border: '2px solid orange', padding: '1rem', marginTop: '1rem' }}>
          <h4>Interactive Question:</h4>
          <p>{interactivePrompt}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
              placeholder="Your response..."
              style={{ flex: 1 }}
            />
            <button onClick={handleSendInput}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

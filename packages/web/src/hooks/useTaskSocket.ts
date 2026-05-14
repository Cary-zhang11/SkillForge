import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskWebSocket } from '../ws.js';

interface TaskMessage {
  type: 'status' | 'output' | 'interactive_prompt' | 'error';
  state?: string;
  data?: string;
  prompt?: string;
  error?: string;
}

export function useTaskSocket(taskId: string | null) {
  const [status, setStatus] = useState<string>('idle');
  const [output, setOutput] = useState<string>('');
  const [interactivePrompt, setInteractivePrompt] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TaskWebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const socket = new TaskWebSocket(
      taskId,
      (message) => {
        const msg = message as TaskMessage;
        switch (msg.type) {
          case 'status':
            setStatus(msg.state || 'unknown');
            break;
          case 'output':
            setOutput((prev) => prev + (msg.data || ''));
            break;
          case 'interactive_prompt':
            setInteractivePrompt(msg.prompt || null);
            break;
          case 'error':
            setOutput((prev) => prev + `\n[Error: ${msg.error}]\n`);
            break;
        }
      },
      () => {
        setIsConnected(false);
      }
    );

    socket.connect();
    socketRef.current = socket;
    setIsConnected(true);

    return () => {
      socket.disconnect();
    };
  }, [taskId]);

  const sendInput = useCallback((text: string) => {
    socketRef.current?.sendUserInput(text);
    setInteractivePrompt(null);
  }, []);

  return { status, output, interactivePrompt, isConnected, sendInput };
}

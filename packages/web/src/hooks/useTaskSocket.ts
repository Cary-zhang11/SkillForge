import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskWebSocket } from '../ws';

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
      (message: TaskMessage) => {
        switch (message.type) {
          case 'status':
            setStatus(message.state || 'unknown');
            break;
          case 'output':
            setOutput((prev) => prev + (message.data || ''));
            break;
          case 'interactive_prompt':
            setInteractivePrompt(message.prompt || null);
            break;
          case 'error':
            setOutput((prev) => prev + `\n[Error: ${message.error}]\n`);
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

const WS_URL = (import.meta as any).env.VITE_WS_URL || 'ws://localhost:3000/ws';

export class TaskWebSocket {
  private ws: WebSocket | null = null;
  private taskId: string;
  private onMessage: (message: unknown) => void;
  private onClose: () => void;

  constructor(taskId: string, onMessage: (message: unknown) => void, onClose: () => void) {
    this.taskId = taskId;
    this.onMessage = onMessage;
    this.onClose = onClose;
  }

  connect(): void {
    const url = `${WS_URL}/${this.taskId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch {
        this.onMessage({ type: 'raw', data: event.data });
      }
    };

    this.ws.onclose = () => {
      this.onClose();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  sendUserInput(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'user_input', payload: { text } }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

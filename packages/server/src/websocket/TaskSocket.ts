import type { WebSocket } from 'ws';
import { AgentPoolManager } from '../services/AgentPoolManager.js';
import { TaskOrchestrator } from '../services/TaskOrchestrator.js';
import { SkillRegistry } from '../services/SkillRegistry.js';
import { FileService } from '../services/FileService.js';

interface TaskSocketOptions {
  agentPool: AgentPoolManager;
  orchestrator: TaskOrchestrator;
  skillRegistry: SkillRegistry;
  fileService: FileService;
}

export class TaskSocket {
  private agentPool: AgentPoolManager;
  private orchestrator: TaskOrchestrator;
  private skillRegistry: SkillRegistry;
  private fileService: FileService;
  private connections: Map<string, WebSocket>;

  constructor(options: TaskSocketOptions) {
    this.agentPool = options.agentPool;
    this.orchestrator = options.orchestrator;
    this.skillRegistry = options.skillRegistry;
    this.fileService = options.fileService;
    this.connections = new Map();
  }

  handleConnection(ws: WebSocket, taskId: string): void {
    this.connections.set(taskId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(taskId, message);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.connections.delete(taskId);
    });

    // Send initial status
    const task = this.orchestrator.getTask(taskId);
    ws.send(JSON.stringify({ type: 'status', state: task?.state || 'unknown' }));
  }

  private async handleMessage(taskId: string, message: { type: string; payload?: unknown }): Promise<void> {
    if (message.type === 'user_input') {
      // Forward user input to the running container
      const task = this.orchestrator.getTask(taskId);
      if (!task || !task.containerId) return;

      const input = (message.payload as { text: string }).text;
      const base64Input = Buffer.from(input).toString('base64');
      await this.agentPool.execInContainer(task.containerId, [
        'sh', '-c',
        `printf '%s' '${base64Input}' | base64 -d > /tmp/user_input.txt`,
      ]);
    }
  }

  sendOutput(taskId: string, output: string): void {
    const ws = this.connections.get(taskId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'output', data: output }));
    }
  }

  sendStatus(taskId: string, state: string): void {
    const ws = this.connections.get(taskId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'status', state }));
    }
  }

  sendInteractivePrompt(taskId: string, prompt: string): void {
    const ws = this.connections.get(taskId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'interactive_prompt', prompt }));
    }
  }
}

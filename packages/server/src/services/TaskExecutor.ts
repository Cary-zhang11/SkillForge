import { AgentPoolManager } from './AgentPoolManager.js';
import { TaskOrchestrator } from './TaskOrchestrator.js';
import { SkillRegistry } from './SkillRegistry.js';
import { FileService } from './FileService.js';
import { TaskSocket } from '../websocket/TaskSocket.js';
import type { Task } from '../types.js';

interface TaskExecutorOptions {
  agentPool: AgentPoolManager;
  orchestrator: TaskOrchestrator;
  skillRegistry: SkillRegistry;
  fileService: FileService;
  taskSocket: TaskSocket;
}

export class TaskExecutor {
  private agentPool: AgentPoolManager;
  private orchestrator: TaskOrchestrator;
  private skillRegistry: SkillRegistry;
  private fileService: FileService;
  private taskSocket: TaskSocket;

  constructor(options: TaskExecutorOptions) {
    this.agentPool = options.agentPool;
    this.orchestrator = options.orchestrator;
    this.skillRegistry = options.skillRegistry;
    this.fileService = options.fileService;
    this.taskSocket = options.taskSocket;
  }

  async execute(task: Task): Promise<void> {
    try {
      // 1. Validate skill exists
      const skill = this.skillRegistry.getSkill(task.skillId);
      if (!skill) {
        throw new Error(`Skill not found: ${task.skillId}`);
      }

      const skillPath = this.skillRegistry.getSkillPath(task.skillId);
      if (!skillPath) {
        throw new Error(`Skill path not found: ${task.skillId}`);
      }

      // 2. Validate background mode restriction
      if (task.mode === 'background' && skill.interactive) {
        throw new Error('Interactive skills cannot run in background mode');
      }

      // 3. Check capacity
      if (this.agentPool.getAvailableCapacity() === 0) {
        this.orchestrator.updateState(task.id, 'queued');
        // In a production system, we'd queue and retry. For MVP, fail fast.
        throw new Error('Max concurrent tasks reached. Please try again later.');
      }

      // 4. Gather user files
      const filePaths: string[] = [];
      for (const fileId of task.fileIds) {
        const filePath = this.fileService.getFilePath(fileId);
        if (filePath) filePaths.push(filePath);
      }

      // 5. Create container
      this.orchestrator.updateState(task.id, 'preparing');
      this.taskSocket.sendStatus(task.id, 'preparing');

      const { containerId } = await this.agentPool.createTaskContainer(
        task.id,
        skillPath,
        filePaths,
        {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        }
      );

      this.orchestrator.setContainerId(task.id, containerId);
      this.orchestrator.updateState(task.id, 'running');
      this.taskSocket.sendStatus(task.id, 'running');

      // 6. Execute Claude Code with the skill
      // We pass the user's text input as the initial prompt to Claude Code
      const userInput = task.inputs.text || '';
      const skillName = skill.name;

      // Start Claude Code in the container and feed the input
      // This is a simplified approach - in production we'd use a more robust PTY integration
      const { stdout, stderr, exitCode } = await this.agentPool.execInContainer(
        containerId,
        [
          'sh',
          '-c',
          `echo "${userInput.replace(/"/g, '\\"')}" | claude --skill "${skillName}" --non-interactive 2>&1 || true`,
        ]
      );

      // 7. Stream output to WebSocket
      this.taskSocket.sendOutput(task.id, stdout);
      if (stderr) {
        this.taskSocket.sendOutput(task.id, `\n[stderr]: ${stderr}\n`);
      }

      // 8. Extract result files from container workspace
      // Look for common output patterns in /workspace
      const resultFiles: string[] = [];
      try {
        const { stdout: lsOutput } = await this.agentPool.execInContainer(
          containerId,
          ['find', '/workspace', '-type', 'f', '-newer', '/workspace/.claude']
        );

        const newFiles = lsOutput.split('\n').filter((f) => f.trim() && !f.includes('.claude'));
        for (const filePath of newFiles) {
          const fileName = filePath.split('/').pop() || 'result';
          const { stdout: fileContent } = await this.agentPool.execInContainer(
            containerId,
            ['cat', filePath]
          );
          const result = await this.fileService.saveResult(task.id, fileName, Buffer.from(fileContent));
          resultFiles.push(result.id);
        }
      } catch {
        // No result files or extraction failed - not critical
      }

      // 9. Complete task
      if (exitCode === 0 || stdout.length > 0) {
        this.orchestrator.setResultFiles(task.id, resultFiles);
        this.orchestrator.updateState(task.id, 'completed');
        this.taskSocket.sendStatus(task.id, 'completed');
      } else {
        throw new Error(`Claude Code exited with code ${exitCode}: ${stderr}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.orchestrator.setError(task.id, message);
      this.taskSocket.sendOutput(task.id, `\n[Error]: ${message}\n`);
      this.taskSocket.sendStatus(task.id, 'failed');
    } finally {
      // 10. Always clean up container
      const taskInfo = this.orchestrator.getTask(task.id);
      if (taskInfo?.containerId) {
        await this.agentPool.destroyTaskContainer(task.id);
      }
    }
  }
}

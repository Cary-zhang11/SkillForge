import Docker from 'dockerode';
import { join } from 'path';
import { mkdirSync, existsSync, cpSync, rmSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface AgentPoolConfig {
  maxConcurrent: number;
  imageName?: string;
  memoryLimit?: number;
  cpuLimit?: number;
  timeoutSeconds?: number;
}

interface ContainerTask {
  taskId: string;
  containerId: string;
  workDir: string;
  startTime: number;
}

export class AgentPoolManager {
  private docker: Docker;
  private config: Required<AgentPoolConfig>;
  private runningTasks: Map<string, ContainerTask>;

  constructor(config: AgentPoolConfig) {
    this.docker = new Docker();
    this.config = {
      maxConcurrent: config.maxConcurrent,
      imageName: config.imageName || 'skillforge/claude-code-runner:latest',
      memoryLimit: config.memoryLimit || 4 * 1024 * 1024 * 1024, // 4GB
      cpuLimit: config.cpuLimit || 2,
      timeoutSeconds: config.timeoutSeconds || 1800, // 30 minutes
    };
    this.runningTasks = new Map();
  }

  getAvailableCapacity(): number {
    return this.config.maxConcurrent - this.runningTasks.size;
  }

  async createTaskContainer(
    taskId: string,
    skillPath: string,
    filePaths: string[],
    envVars: Record<string, string> = {}
  ): Promise<{ containerId: string; workDir: string }> {
    if (this.runningTasks.size >= this.config.maxConcurrent) {
      throw new Error('Max concurrent tasks reached');
    }

    // Create temporary work directory
    const workDir = join(process.cwd(), 'tmp', taskId);
    if (existsSync(workDir)) rmSync(workDir, { recursive: true });
    mkdirSync(workDir, { recursive: true });

    // Inject skill into .claude/skills/
    const skillsDir = join(workDir, '.claude', 'skills');
    mkdirSync(skillsDir, { recursive: true });
    const skillName = skillPath.split('/').pop() || 'skill';
    const targetSkillDir = join(skillsDir, skillName);
    cpSync(skillPath, targetSkillDir, { recursive: true });

    // Copy user files to workspace
    const workspaceDir = join(workDir, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || uuidv4();
      cpSync(filePath, join(workspaceDir, fileName));
    }

    // Prepare environment variables
    const env = [
      `TASK_ID=${taskId}`,
      `WORKSPACE_DIR=/workspace`,
      `CLAUDE_SKILLS_PATH=/workspace/.claude/skills`,
      ...Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
    ];

    // Create and start container
    const container = await this.docker.createContainer({
      Image: this.config.imageName,
      Env: env,
      HostConfig: {
        Binds: [`${workspaceDir}:/workspace:rw`],
        Memory: this.config.memoryLimit,
        CpuQuota: this.config.cpuLimit * 100000,
        NetworkMode: 'bridge',
        AutoRemove: false,
        // Security hardening
        ReadonlyRootfs: false, // Claude Code needs to write to ~/.claude
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETGID', 'SETUID'], // Minimum capabilities
      },
      WorkingDir: '/workspace',
      Cmd: ['sleep', '3600'], // Keep container alive, we'll exec commands in it
    });

    await container.start();

    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id;

    this.runningTasks.set(taskId, {
      taskId,
      containerId,
      workDir,
      startTime: Date.now(),
    });

    return { containerId, workDir };
  }

  async execInContainer(
    containerId: string,
    cmd: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    let stdout = '';
    let stderr = '';

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        // Docker multiplexed stream: first 8 bytes are header
        if (chunk.length > 8) {
          const streamType = chunk[0];
          const payload = chunk.slice(8).toString('utf-8');
          if (streamType === 1) stdout += payload;
          else stderr += payload;
        }
      });

      stream.on('end', async () => {
        try {
          const result = await exec.inspect();
          resolve({
            stdout,
            stderr,
            exitCode: result.ExitCode || 0,
          });
        } catch (err) {
          reject(err);
        }
      });

      stream.on('error', reject);
    });
  }

  async destroyTaskContainer(taskId: string): Promise<void> {
    const task = this.runningTasks.get(taskId);
    if (!task) return;

    try {
      const container = this.docker.getContainer(task.containerId);
      await container.stop({ t: 10 });
      await container.remove();
    } catch (err) {
      // Container may already be stopped/removed
      console.warn(`Failed to clean up container for task ${taskId}:`, err);
    }

    // Clean up work directory
    try {
      rmSync(task.workDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to clean up work directory for task ${taskId}:`, err);
    }

    this.runningTasks.delete(taskId);
  }

  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys());
  }

  async cleanup(): Promise<void> {
    for (const taskId of this.runningTasks.keys()) {
      await this.destroyTaskContainer(taskId);
    }
  }
}

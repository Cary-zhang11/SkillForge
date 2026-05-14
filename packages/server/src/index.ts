import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { join } from 'path';

import { config } from './config.js';
import { initDb } from './db.js';
import { SkillRegistry } from './services/SkillRegistry.js';
import { TaskOrchestrator } from './services/TaskOrchestrator.js';
import { AgentPoolManager } from './services/AgentPoolManager.js';
import { FileService } from './services/FileService.js';
import { TaskSocket } from './websocket/TaskSocket.js';
import { TaskExecutor } from './services/TaskExecutor.js';
import { validateTaskInput } from './middleware/validation.js';

import skillsRoute from './routes/skills.js';
import filesRoute from './routes/files.js';

// Initialize database
initDb();

// Initialize services
const skillRegistry = new SkillRegistry(config.skillsDir);
const taskOrchestrator = new TaskOrchestrator();
const agentPool = new AgentPoolManager({
  maxConcurrent: config.maxConcurrentTasks,
  memoryLimit: config.containerMemoryLimit,
  cpuLimit: config.containerCpuLimit,
  timeoutSeconds: config.taskTimeoutSeconds,
});
const fileService = new FileService();
const taskSocket = new TaskSocket({
  agentPool,
  orchestrator: taskOrchestrator,
  skillRegistry,
  fileService,
});

const taskExecutor = new TaskExecutor({
  agentPool,
  orchestrator: taskOrchestrator,
  skillRegistry,
  fileService,
  taskSocket,
});

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files and results statically
app.use('/uploads', express.static(config.uploadsDir));
app.use('/results', express.static(config.resultsDir));

// API routes
app.use('/api/skills', skillsRoute);
app.use('/api/files', filesRoute);

// Tasks route with execution
app.post('/api/tasks', validateTaskInput, async (req, res) => {
  const { userId, skillId, skillVersion, inputs, fileIds, mode } = req.body;

  if (!userId || !skillId || !mode) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const task = taskOrchestrator.createTask({
      userId,
      skillId,
      skillVersion: skillVersion || '1.0.0',
      inputs: inputs || {},
      fileIds: fileIds || [],
      mode,
    });

    // Start execution asynchronously
    taskExecutor.execute(task).catch((err) => {
      console.error('Task execution error:', err);
    });

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  const task = taskOrchestrator.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

app.get('/api/tasks', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  const tasks = taskOrchestrator.listTasks(userId);
  res.json({ tasks });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeTasks: agentPool.getRunningTasks().length,
    maxConcurrent: config.maxConcurrentTasks,
  });
});

// Serve frontend static files
app.use(express.static(config.webDistDir));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(join(config.webDistDir, 'index.html'));
});

// HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = req.url || '';
  const match = url.match(/\/ws\/(.+)/);
  if (!match) {
    ws.close(1008, 'Invalid path');
    return;
  }

  const taskId = match[1];
  taskSocket.handleConnection(ws, taskId);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  wss.close();
  await agentPool.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(config.port, config.host, () => {
  console.log(`SkillForge server running on http://${config.host}:${config.port}`);
  console.log(`Skills directory: ${config.skillsDir}`);
  console.log(`Max concurrent tasks: ${config.maxConcurrentTasks}`);
});

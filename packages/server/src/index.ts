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

import skillsRoute from './routes/skills.js';
import tasksRoute from './routes/tasks.js';
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

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files and results statically
app.use('/uploads', express.static(config.uploadsDir));
app.use('/results', express.static(config.resultsDir));

// API routes
app.use('/api/skills', skillsRoute);
app.use('/api/tasks', tasksRoute);
app.use('/api/files', filesRoute);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeTasks: agentPool.getRunningTasks().length,
    maxConcurrent: config.maxConcurrentTasks,
  });
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

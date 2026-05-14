import { Router } from 'express';
import { TaskOrchestrator } from '../services/TaskOrchestrator.js';

const router = Router();
const orchestrator = new TaskOrchestrator();

router.post('/', (req, res) => {
  const { userId, skillId, skillVersion, inputs, fileIds, mode } = req.body;

  if (!userId || !skillId || !mode) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const task = orchestrator.createTask({
      userId,
      skillId,
      skillVersion: skillVersion || '1.0.0',
      inputs: inputs || {},
      fileIds: fileIds || [],
      mode,
    });
    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/:id', (req, res) => {
  const task = orchestrator.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

router.get('/', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  const tasks = orchestrator.listTasks(userId);
  res.json({ tasks });
});

export default router;

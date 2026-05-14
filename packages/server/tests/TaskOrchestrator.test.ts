import { describe, it, expect, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../src/services/TaskOrchestrator.js';
import { db } from '../src/db.js';

describe('TaskOrchestrator', () => {
  beforeEach(() => {
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM skills');
    // Insert a test skill so the foreign key constraint is satisfied
    db.exec(`
      INSERT INTO skills (id, name, version, description, interactive, skill_path, created_at)
      VALUES ('test-skill', 'Test Skill', '1.0.0', 'A test skill', 0, 'skills/test-skill', 0)
    `);
  });

  it('should create a task', () => {
    const orchestrator = new TaskOrchestrator();
    const task = orchestrator.createTask({
      userId: 'user-1',
      skillId: 'test-skill',
      skillVersion: '1.0.0',
      inputs: { text: 'hello' },
      fileIds: [],
      mode: 'fast',
    });

    expect(task.userId).toBe('user-1');
    expect(task.state).toBe('pending');
    expect(task.mode).toBe('fast');
  });

  it('should transition task state', () => {
    const orchestrator = new TaskOrchestrator();
    const task = orchestrator.createTask({
      userId: 'user-1',
      skillId: 'test-skill',
      skillVersion: '1.0.0',
      inputs: {},
      fileIds: [],
      mode: 'fast',
    });

    orchestrator.updateState(task.id, 'running');
    const updated = orchestrator.getTask(task.id);
    expect(updated?.state).toBe('running');
  });
});

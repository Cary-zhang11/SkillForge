import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { Task, TaskState, ExecutionMode } from '../types.js';

interface CreateTaskOptions {
  userId: string;
  skillId: string;
  skillVersion: string;
  inputs: Record<string, string>;
  fileIds: string[];
  mode: ExecutionMode;
}

export class TaskOrchestrator {
  createTask(options: CreateTaskOptions): Task {
    const task: Task = {
      id: uuidv4(),
      userId: options.userId,
      skillId: options.skillId,
      skillVersion: options.skillVersion,
      inputs: options.inputs,
      fileIds: options.fileIds,
      mode: options.mode,
      state: 'pending',
      createdAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO tasks (id, user_id, skill_id, skill_version, inputs, file_ids, mode, state, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.userId,
      task.skillId,
      task.skillVersion,
      JSON.stringify(task.inputs),
      JSON.stringify(task.fileIds),
      task.mode,
      task.state,
      task.createdAt
    );

    return task;
  }

  getTask(id: string): Task | null {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      user_id: string;
      skill_id: string;
      skill_version: string;
      inputs: string;
      file_ids: string;
      mode: string;
      state: string;
      created_at: number;
      started_at: number | null;
      completed_at: number | null;
      error_message: string | null;
      result_file_ids: string | null;
      container_id: string | null;
    } | undefined;

    if (!row) return null;

    return this.rowToTask(row);
  }

  listTasks(userId: string): Task[] {
    const stmt = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as Array<{
      id: string;
      user_id: string;
      skill_id: string;
      skill_version: string;
      inputs: string;
      file_ids: string;
      mode: string;
      state: string;
      created_at: number;
      started_at: number | null;
      completed_at: number | null;
      error_message: string | null;
      result_file_ids: string | null;
      container_id: string | null;
    }>;

    return rows.map((r) => this.rowToTask(r));
  }

  updateState(id: string, state: TaskState): void {
    const updates: Record<string, number | string> = { state };

    if (state === 'running') {
      updates.started_at = Date.now();
    }
    if (['completed', 'failed', 'cancelled', 'timeout'].includes(state)) {
      updates.completed_at = Date.now();
    }

    const fields = Object.keys(updates);
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`);
    stmt.run(...fields.map((f) => updates[f]), id);
  }

  setContainerId(id: string, containerId: string): void {
    const stmt = db.prepare('UPDATE tasks SET container_id = ? WHERE id = ?');
    stmt.run(containerId, id);
  }

  setError(id: string, errorMessage: string): void {
    const stmt = db.prepare('UPDATE tasks SET error_message = ?, state = ? WHERE id = ?');
    stmt.run(errorMessage, 'failed', id);
  }

  setResultFiles(id: string, resultFileIds: string[]): void {
    const stmt = db.prepare('UPDATE tasks SET result_file_ids = ?, state = ? WHERE id = ?');
    stmt.run(JSON.stringify(resultFileIds), 'completed', id);
  }

  private rowToTask(row: {
    id: string;
    user_id: string;
    skill_id: string;
    skill_version: string;
    inputs: string;
    file_ids: string;
    mode: string;
    state: string;
    created_at: number;
    started_at: number | null;
    completed_at: number | null;
    error_message: string | null;
    result_file_ids: string | null;
    container_id: string | null;
  }): Task {
    return {
      id: row.id,
      userId: row.user_id,
      skillId: row.skill_id,
      skillVersion: row.skill_version,
      inputs: JSON.parse(row.inputs),
      fileIds: JSON.parse(row.file_ids),
      mode: row.mode as ExecutionMode,
      state: row.state as TaskState,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      errorMessage: row.error_message || undefined,
      resultFileIds: row.result_file_ids ? JSON.parse(row.result_file_ids) : undefined,
      containerId: row.container_id || undefined,
    };
  }
}

export type TaskState =
  | 'pending'
  | 'queued'
  | 'preparing'
  | 'running'
  | 'awaiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type ExecutionMode = 'fast' | 'background';

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  interactive: boolean;
}

export interface Task {
  id: string;
  userId: string;
  skillId: string;
  skillVersion: string;
  inputs: Record<string, string>;
  fileIds: string[];
  mode: ExecutionMode;
  state: TaskState;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  resultFileIds?: string[];
}

export interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

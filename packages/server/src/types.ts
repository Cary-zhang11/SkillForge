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
  inputs?: SkillInput[];
  output?: SkillOutput;
}

export interface SkillInput {
  name: string;
  type: 'text' | 'file' | 'select';
  required: boolean;
  description: string;
  options?: string[];
  default?: string;
}

export interface SkillOutput {
  type: 'text' | 'file';
  format?: string;
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
  containerId?: string;
}

export interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: number;
  taskId?: string;
}

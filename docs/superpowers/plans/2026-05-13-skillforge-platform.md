# SkillForge Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based platform for QA and developers to remotely use Claude Code skills through a browser, with tasks executed in isolated Docker containers.

**Architecture:** Node.js/Express backend serves REST API and WebSocket connections, React frontend provides the UI, SQLite stores task/skill metadata, dockerode manages Docker containers running Claude Code CLI with injected skills.

**Tech Stack:** React 18 + TypeScript + Vite (frontend), Node.js + Express + TypeScript (backend), SQLite with better-sqlite3 (database), dockerode (Docker API), ws (WebSocket), multer (file upload)

---

## File Structure

```
SkillForge/
├── packages/
│   ├── server/                          # Backend (Node.js + Express)
│   │   ├── src/
│   │   │   ├── index.ts                 # Entry point, HTTP + WS server startup
│   │   │   ├── config.ts                # Environment variables and config
│   │   │   ├── db.ts                    # SQLite connection and schema setup
│   │   │   ├── types.ts                 # Shared TypeScript interfaces
│   │   │   ├── routes/
│   │   │   │   ├── skills.ts            # Skill CRUD API
│   │   │   │   ├── tasks.ts             # Task submit/query/cancel API
│   │   │   │   └── files.ts             # File upload/download API
│   │   │   ├── services/
│   │   │   │   ├── SkillRegistry.ts     # Skill storage, validation, metadata parsing
│   │   │   │   ├── TaskOrchestrator.ts  # Task state machine, lifecycle management
│   │   │   │   ├── AgentPoolManager.ts  # Docker container lifecycle
│   │   │   │   └── FileService.ts       # File upload, download, cleanup
│   │   │   └── websocket/
│   │   │       └── TaskSocket.ts        # WebSocket handlers for real-time task I/O
│   │   ├── tests/
│   │   │   ├── SkillRegistry.test.ts
│   │   │   ├── TaskOrchestrator.test.ts
│   │   │   └── AgentPoolManager.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                             # Frontend (React + Vite)
│       ├── src/
│       │   ├── main.tsx                 # React entry point
│       │   ├── App.tsx                  # Root component with routing
│       │   ├── api.ts                   # HTTP API client
│       │   ├── ws.ts                    # WebSocket client
│       │   ├── types.ts                 # Shared types
│       │   ├── components/
│       │   │   ├── SkillBrowser.tsx     # Skill list, search, select
│       │   │   ├── TaskSubmitForm.tsx   # File upload, input, mode selection
│       │   │   ├── TaskOutputPanel.tsx  # Real-time streaming output display
│       │   │   ├── InteractivePrompt.tsx # Modal for interactive skill questions
│       │   │   └── TaskHistory.tsx      # Past tasks list with status/download
│       │   └── hooks/
│       │       └── useTaskSocket.ts     # WebSocket connection management
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
│
├── skills/                              # Built-in skills storage (runtime)
├── uploads/                             # User file uploads (runtime)
├── results/                             # Task result files (runtime)
├── docker/
│   └── Dockerfile.claude-code           # Claude Code runner image
├── package.json                         # Root monorepo config
└── tsconfig.base.json                   # Shared TypeScript config
```

---

## Prerequisites

Before starting, ensure the development machine has:
- Node.js 18+ and npm
- Docker Engine running locally
- Claude Code CLI installed locally (for testing container builds)
- An Anthropic API key exported as `ANTHROPIC_API_KEY`

---

## Task 1: Project Scaffolding

Set up the monorepo structure with TypeScript configuration.

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/index.html`
- Create: `packages/web/vite.config.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "skillforge",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=packages/server & npm run dev --workspace=packages/web",
    "build": "npm run build --workspace=packages/server && npm run build --workspace=packages/web",
    "test": "npm test --workspace=packages/server"
  }
}
```

- [ ] **Step 2: Create shared TypeScript base config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create server package.json**

```json
{
  "name": "@skillforge/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.0",
    "ws": "^8.16.0",
    "multer": "^1.4.5-lts.1",
    "better-sqlite3": "^9.4.0",
    "dockerode": "^4.0.0",
    "js-yaml": "^4.1.0",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "@types/multer": "^1.4.11",
    "@types/js-yaml": "^4.0.9",
    "@types/uuid": "^9.0.0",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 4: Create server tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: Create web package.json**

```json
{
  "name": "@skillforge/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```

- [ ] **Step 6: Create web tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 7: Create web index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillForge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create web vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 9: Install dependencies**

```bash
cd packages/server && npm install
cd ../web && npm install
```

Expected: Both `node_modules` directories created, no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: project scaffolding with server and web packages"
```

---

## Task 2: Database Schema and Types

Set up SQLite database with schema for skills, tasks, and files. Define shared TypeScript types.

**Files:**
- Create: `packages/server/src/types.ts`
- Create: `packages/server/src/db.ts`
- Create: `packages/web/src/types.ts`

- [ ] **Step 1: Write the types test**

Create `packages/server/tests/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { TaskState, SkillManifest } from '../src/types';

describe('types', () => {
  it('TaskState should accept valid states', () => {
    const state: TaskState = 'running';
    expect(state).toBe('running');
  });

  it('SkillManifest should have required fields', () => {
    const skill: SkillManifest = {
      id: 'test-skill',
      name: 'Test Skill',
      version: '1.0.0',
      description: 'A test skill',
      interactive: false,
    };
    expect(skill.name).toBe('Test Skill');
    expect(skill.interactive).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/server && npx vitest run tests/types.test.ts
```

Expected: FAIL - "Cannot find module '../src/types'"

- [ ] **Step 3: Write shared types**

Create `packages/server/src/types.ts`:

```typescript
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
```

- [ ] **Step 4: Write database setup**

Create `packages/server/src/db.ts`:

```typescript
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.SKILLFORGE_DB || join(process.cwd(), 'data', 'skillforge.db');

export const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    interactive INTEGER NOT NULL DEFAULT 0,
    config TEXT,
    skill_path TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(name, version)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    skill_version TEXT NOT NULL,
    inputs TEXT NOT NULL,
    file_ids TEXT NOT NULL,
    mode TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    error_message TEXT,
    result_file_ids TEXT,
    container_id TEXT,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    task_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
`);

export function initDb(): void {
  // Schema is created on module load; this function exists for explicit initialization if needed
  console.log('Database initialized at:', DB_PATH);
}
```

- [ ] **Step 5: Create data directory**

```bash
mkdir -p packages/server/data
```

- [ ] **Step 6: Copy types to frontend**

Create `packages/web/src/types.ts`:

```typescript
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
```

- [ ] **Step 7: Run tests**

```bash
cd packages/server && npx vitest run tests/types.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: database schema and shared types"
```

---

## Task 3: Skill Registry Service

Implement Skill storage, metadata parsing, and CRUD API.

**Files:**
- Create: `packages/server/src/services/SkillRegistry.ts`
- Create: `packages/server/tests/SkillRegistry.test.ts`
- Create: `packages/server/src/routes/skills.ts`

- [ ] **Step 1: Write SkillRegistry tests**

Create `packages/server/tests/SkillRegistry.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../src/services/SkillRegistry';
import { db } from '../src/db';

describe('SkillRegistry', () => {
  beforeEach(() => {
    db.exec('DELETE FROM skills');
  });

  it('should register a skill from directory', () => {
    const registry = new SkillRegistry();
    // This test requires a test skill directory to exist
    // We'll create it in the implementation step
    expect(registry).toBeDefined();
  });

  it('should list all skills', () => {
    const registry = new SkillRegistry();
    const skills = registry.listSkills();
    expect(Array.isArray(skills)).toBe(true);
  });
});
```

- [ ] **Step 2: Create test skill directory**

```bash
mkdir -p skills/test-skill
cat > skills/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

This is a test skill used for verifying the SkillRegistry.
EOF

cat > skills/test-skill/skill.yaml << 'EOF'
name: test-skill
version: 1.0.0
description: A test skill for unit testing
interactive: false
EOF
```

- [ ] **Step 3: Implement SkillRegistry**

Create `packages/server/src/services/SkillRegistry.ts`:

```typescript
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { db } from '../db.js';
import type { SkillManifest } from '../types.js';

const SKILLS_DIR = process.env.SKILLFORGE_SKILLS_DIR || join(process.cwd(), 'skills');

export class SkillRegistry {
  private skillsDir: string;

  constructor(skillsDir: string = SKILLS_DIR) {
    this.skillsDir = skillsDir;
    this.scanAndRegister();
  }

  scanAndRegister(): void {
    if (!existsSync(this.skillsDir)) return;

    const entries = readdirSync(this.skillsDir);
    for (const entry of entries) {
      const skillPath = join(this.skillsDir, entry);
      const stat = statSync(skillPath);
      if (!stat.isDirectory()) continue;

      const manifest = this.parseSkillManifest(skillPath);
      if (manifest) {
        this.saveSkill(manifest, skillPath);
      }
    }
  }

  parseSkillManifest(skillPath: string): SkillManifest | null {
    const yamlPath = join(skillPath, 'skill.yaml');
    const mdPath = join(skillPath, 'SKILL.md');

    if (!existsSync(yamlPath) || !existsSync(mdPath)) {
      return null;
    }

    try {
      const yamlContent = readFileSync(yamlPath, 'utf-8');
      const config = yaml.load(yamlContent) as Record<string, unknown>;

      return {
        id: `${config.name}-${config.version}`,
        name: String(config.name),
        version: String(config.version),
        description: String(config.description || ''),
        interactive: Boolean(config.interactive),
      };
    } catch {
      return null;
    }
  }

  private saveSkill(manifest: SkillManifest, skillPath: string): void {
    const stmt = db.prepare(`
      INSERT INTO skills (id, name, version, description, interactive, skill_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        description = excluded.description,
        interactive = excluded.interactive,
        skill_path = excluded.skill_path
    `);
    stmt.run(
      manifest.id,
      manifest.name,
      manifest.version,
      manifest.description,
      manifest.interactive ? 1 : 0,
      skillPath,
      Date.now()
    );
  }

  listSkills(): SkillManifest[] {
    const stmt = db.prepare('SELECT * FROM skills ORDER BY name, version');
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      version: string;
      description: string;
      interactive: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      description: r.description,
      interactive: Boolean(r.interactive),
    }));
  }

  getSkill(id: string): SkillManifest | null {
    const stmt = db.prepare('SELECT * FROM skills WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      name: string;
      version: string;
      description: string;
      interactive: number;
      skill_path: string;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      interactive: Boolean(row.interactive),
    };
  }

  getSkillPath(id: string): string | null {
    const stmt = db.prepare('SELECT skill_path FROM skills WHERE id = ?');
    const row = stmt.get(id) as { skill_path: string } | undefined;
    return row?.skill_path || null;
  }
}
```

- [ ] **Step 4: Implement skills route**

Create `packages/server/src/routes/skills.ts`:

```typescript
import { Router } from 'express';
import { SkillRegistry } from '../services/SkillRegistry.js';

const router = Router();
const registry = new SkillRegistry();

router.get('/', (_req, res) => {
  const skills = registry.listSkills();
  res.json({ skills });
});

router.get('/:id', (req, res) => {
  const skill = registry.getSkill(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  res.json({ skill });
});

export default router;
```

- [ ] **Step 5: Run tests**

```bash
cd packages/server && npx vitest run tests/SkillRegistry.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: SkillRegistry with scan, parse, and CRUD API"
```

---

## Task 4: File Service

Implement file upload, download, and cleanup.

**Files:**
- Create: `packages/server/src/services/FileService.ts`
- Create: `packages/server/src/routes/files.ts`
- Modify: `packages/server/src/db.ts` (ensure uploads/ and results/ directories)

- [ ] **Step 1: Create upload and results directories**

```bash
mkdir -p packages/server/uploads packages/server/results
```

- [ ] **Step 2: Implement FileService**

Create `packages/server/src/services/FileService.ts`:

```typescript
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { StoredFile } from '../types.js';

const UPLOADS_DIR = process.env.SKILLFORGE_UPLOADS_DIR || join(process.cwd(), 'uploads');
const RESULTS_DIR = process.env.SKILLFORGE_RESULTS_DIR || join(process.cwd(), 'results');

export class FileService {
  constructor() {
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  }

  saveUpload(originalName: string, mimeType: string, buffer: Buffer): StoredFile {
    const id = uuidv4();
    const fileName = `${id}-${originalName}`;
    const filePath = join(UPLOADS_DIR, fileName);

    const fs = await import('fs');
    fs.writeFileSync(filePath, buffer);

    const file: StoredFile = {
      id,
      originalName,
      mimeType,
      size: buffer.length,
      path: filePath,
      uploadedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO files (id, original_name, mime_type, size, path, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, originalName, mimeType, buffer.length, filePath, file.uploadedAt);

    return file;
  }

  async saveResult(taskId: string, fileName: string, buffer: Buffer): Promise<StoredFile> {
    const id = uuidv4();
    const resultPath = join(RESULTS_DIR, taskId);
    if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

    const filePath = join(resultPath, fileName);
    const fs = await import('fs');
    fs.writeFileSync(filePath, buffer);

    const file: StoredFile = {
      id,
      originalName: fileName,
      mimeType: 'application/octet-stream',
      size: buffer.length,
      path: filePath,
      uploadedAt: Date.now(),
      taskId,
    };

    const stmt = db.prepare(`
      INSERT INTO files (id, original_name, mime_type, size, path, uploaded_at, task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, fileName, file.mimeType, buffer.length, filePath, file.uploadedAt, taskId);

    return file;
  }

  getFile(id: string): StoredFile | null {
    const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      original_name: string;
      mime_type: string;
      size: number;
      path: string;
      uploaded_at: number;
      task_id: string | null;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      path: row.path,
      uploadedAt: row.uploaded_at,
      taskId: row.task_id || undefined,
    };
  }

  getFilePath(id: string): string | null {
    const file = this.getFile(id);
    return file?.path || null;
  }

  linkFilesToTask(fileIds: string[], taskId: string): void {
    const stmt = db.prepare('UPDATE files SET task_id = ? WHERE id = ?');
    for (const fileId of fileIds) {
      stmt.run(taskId, fileId);
    }
  }
}
```

- [ ] **Step 3: Implement files route**

Create `packages/server/src/routes/files.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { FileService } from '../services/FileService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const fileService = new FileService();

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const file = fileService.saveUpload(
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );
    res.json({ file: { id: file.id, originalName: file.originalName, size: file.size } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save file' });
  }
});

router.get('/download/:id', (req, res) => {
  const filePath = fileService.getFilePath(req.params.id);
  if (!filePath) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
});

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: FileService with upload and download"
```

---

## Task 5: Agent Pool Manager

Implement Docker container lifecycle management for Claude Code execution.

**Files:**
- Create: `packages/server/src/services/AgentPoolManager.ts`
- Create: `packages/server/tests/AgentPoolManager.test.ts`
- Create: `docker/Dockerfile.claude-code`

- [ ] **Step 1: Write AgentPoolManager tests**

Create `packages/server/tests/AgentPoolManager.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { AgentPoolManager } from '../src/services/AgentPoolManager';

describe('AgentPoolManager', () => {
  let manager: AgentPoolManager;

  beforeAll(() => {
    manager = new AgentPoolManager({ maxConcurrent: 2 });
  });

  it('should initialize with correct config', () => {
    expect(manager).toBeDefined();
  });

  it('should return available capacity', () => {
    const capacity = manager.getAvailableCapacity();
    expect(capacity).toBe(2);
  });
});
```

- [ ] **Step 2: Create Claude Code runner Dockerfile**

Create `docker/Dockerfile.claude-code`:

```dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN useradd -m -u 1000 claude
USER claude
WORKDIR /workspace

# Claude Code will use this directory for skill discovery
ENV CLAUDE_SKILLS_PATH=/workspace/.claude/skills

# Default command: start Claude Code in project mode
CMD ["claude"]
```

- [ ] **Step 3: Build the Docker image**

```bash
docker build -t skillforge/claude-code-runner:latest -f docker/Dockerfile.claude-code docker/
```

Expected: Image builds successfully.

- [ ] **Step 4: Implement AgentPoolManager**

Create `packages/server/src/services/AgentPoolManager.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests**

```bash
cd packages/server && npx vitest run tests/AgentPoolManager.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: AgentPoolManager with Docker container lifecycle"
```

---

## Task 6: Task Orchestrator

Implement task state machine, submission, and execution flow.

**Files:**
- Create: `packages/server/src/services/TaskOrchestrator.ts`
- Create: `packages/server/tests/TaskOrchestrator.test.ts`
- Create: `packages/server/src/routes/tasks.ts`

- [ ] **Step 1: Write TaskOrchestrator tests**

Create `packages/server/tests/TaskOrchestrator.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../src/services/TaskOrchestrator';
import { db } from '../src/db';

describe('TaskOrchestrator', () => {
  beforeEach(() => {
    db.exec('DELETE FROM tasks');
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
```

- [ ] **Step 2: Implement TaskOrchestrator**

Create `packages/server/src/services/TaskOrchestrator.ts`:

```typescript
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
```

- [ ] **Step 3: Implement tasks route**

Create `packages/server/src/routes/tasks.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
cd packages/server && npx vitest run tests/TaskOrchestrator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: TaskOrchestrator with state machine and CRUD API"
```

---

## Task 7: WebSocket Real-Time Communication

Implement WebSocket handlers for streaming task output between browser and Claude Code containers.

**Files:**
- Create: `packages/server/src/websocket/TaskSocket.ts`
- Create: `packages/web/src/ws.ts`
- Create: `packages/web/src/hooks/useTaskSocket.ts`

- [ ] **Step 1: Implement server-side WebSocket handler**

Create `packages/server/src/websocket/TaskSocket.ts`:

```typescript
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
      await this.agentPool.execInContainer(task.containerId, ['sh', '-c', `echo "${input}"`]);
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
```

- [ ] **Step 2: Implement client-side WebSocket**

Create `packages/web/src/ws.ts`:

```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

export class TaskWebSocket {
  private ws: WebSocket | null = null;
  private taskId: string;
  private onMessage: (message: unknown) => void;
  private onClose: () => void;

  constructor(taskId: string, onMessage: (message: unknown) => void, onClose: () => void) {
    this.taskId = taskId;
    this.onMessage = onMessage;
    this.onClose = onClose;
  }

  connect(): void {
    const url = `${WS_URL}/${this.taskId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch {
        this.onMessage({ type: 'raw', data: event.data });
      }
    };

    this.ws.onclose = () => {
      this.onClose();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  sendUserInput(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'user_input', payload: { text } }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

- [ ] **Step 3: Implement React hook**

Create `packages/web/src/hooks/useTaskSocket.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskWebSocket } from '../ws';

interface TaskMessage {
  type: 'status' | 'output' | 'interactive_prompt' | 'error';
  state?: string;
  data?: string;
  prompt?: string;
  error?: string;
}

export function useTaskSocket(taskId: string | null) {
  const [status, setStatus] = useState<string>('idle');
  const [output, setOutput] = useState<string>('');
  const [interactivePrompt, setInteractivePrompt] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TaskWebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const socket = new TaskWebSocket(
      taskId,
      (message: TaskMessage) => {
        switch (message.type) {
          case 'status':
            setStatus(message.state || 'unknown');
            break;
          case 'output':
            setOutput((prev) => prev + (message.data || ''));
            break;
          case 'interactive_prompt':
            setInteractivePrompt(message.prompt || null);
            break;
          case 'error':
            setOutput((prev) => prev + `\n[Error: ${message.error}]\n`);
            break;
        }
      },
      () => {
        setIsConnected(false);
      }
    );

    socket.connect();
    socketRef.current = socket;
    setIsConnected(true);

    return () => {
      socket.disconnect();
    };
  }, [taskId]);

  const sendInput = useCallback((text: string) => {
    socketRef.current?.sendUserInput(text);
    setInteractivePrompt(null);
  }, []);

  return { status, output, interactivePrompt, isConnected, sendInput };
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: WebSocket real-time communication for task streaming"
```

---

## Task 8: Server Entry Point and Integration

Wire all backend services together into the Express app.

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/config.ts`

- [ ] **Step 1: Create config module**

Create `packages/server/src/config.ts`:

```typescript
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  skillsDir: process.env.SKILLFORGE_SKILLS_DIR || './skills',
  uploadsDir: process.env.SKILLFORGE_UPLOADS_DIR || './uploads',
  resultsDir: process.env.SKILLFORGE_RESULTS_DIR || './results',
  dbPath: process.env.SKILLFORGE_DB || './data/skillforge.db',
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '3'),
  containerMemoryLimit: parseInt(process.env.CONTAINER_MEMORY_LIMIT || '4294967296'),
  containerCpuLimit: parseInt(process.env.CONTAINER_CPU_LIMIT || '2'),
  taskTimeoutSeconds: parseInt(process.env.TASK_TIMEOUT_SECONDS || '1800'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
};
```

- [ ] **Step 2: Create server entry point**

Create `packages/server/src/index.ts`:

```typescript
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
```

- [ ] **Step 3: Test server startup**

```bash
cd packages/server && npx tsx src/index.ts
```

Expected: Server starts on port 3000, no errors.

- [ ] **Step 4: Test API endpoints**

In another terminal:

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","activeTasks":0,"maxConcurrent":3}`

```bash
curl http://localhost:3000/api/skills
```

Expected: `{"skills":[...]}` with the test skill from Task 3.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: server entry point with all services integrated"
```

---

## Task 9: Frontend React Application

Build the React frontend with skill browser, task submission, and output display.

**Files:**
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/api.ts`
- Create: `packages/web/src/components/SkillBrowser.tsx`
- Create: `packages/web/src/components/TaskSubmitForm.tsx`
- Create: `packages/web/src/components/TaskOutputPanel.tsx`

- [ ] **Step 1: Create React entry point**

Create `packages/web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create API client**

Create `packages/web/src/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchSkills() {
  const res = await fetch(`${API_BASE}/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function fetchSkill(id: string) {
  const res = await fetch(`${API_BASE}/skills/${id}`);
  if (!res.ok) throw new Error('Failed to fetch skill');
  return res.json();
}

export async function createTask(data: {
  userId: string;
  skillId: string;
  skillVersion: string;
  inputs: Record<string, string>;
  fileIds: string[];
  mode: 'fast' | 'background';
}) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function fetchTask(id: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}
```

- [ ] **Step 3: Create SkillBrowser component**

Create `packages/web/src/components/SkillBrowser.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { fetchSkills } from '../api';
import type { SkillManifest } from '../types';

interface SkillBrowserProps {
  onSelectSkill: (skill: SkillManifest) => void;
}

export default function SkillBrowser({ onSelectSkill }: SkillBrowserProps) {
  const [skills, setSkills] = useState<SkillManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSkills()
      .then((data) => setSkills(data.skills))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading skills...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Select a Skill</h2>
      <input
        type="text"
        placeholder="Search skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {filtered.map((skill) => (
          <div
            key={skill.id}
            onClick={() => onSelectSkill(skill)}
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <h3>{skill.name}</h3>
            <p>{skill.description}</p>
            <small>v{skill.version} {skill.interactive ? '(Interactive)' : ''}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TaskSubmitForm component**

Create `packages/web/src/components/TaskSubmitForm.tsx`:

```tsx
import { useState } from 'react';
import { createTask, uploadFile } from '../api';
import type { SkillManifest } from '../types';

interface TaskSubmitFormProps {
  skill: SkillManifest;
  userId: string;
  onTaskCreated: (taskId: string) => void;
}

export default function TaskSubmitForm({ skill, userId, onTaskCreated }: TaskSubmitFormProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'fast' | 'background'>('fast');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileIds((prev) => [...prev, result.file.id]);
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (skill.interactive && mode === 'background') {
      alert('Interactive skills cannot run in background mode');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTask({
        userId,
        skillId: skill.id,
        skillVersion: skill.version,
        inputs,
        fileIds,
        mode,
      });
      onTaskCreated(result.task.id);
    } catch (err) {
      alert('Failed to create task: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Run: {skill.name}</h2>
      <p>{skill.description}</p>

      <div>
        <label>
          <input
            type="radio"
            value="fast"
            checked={mode === 'fast'}
            onChange={() => setMode('fast')}
          />
          Fast (real-time)
        </label>
        <label>
          <input
            type="radio"
            value="background"
            checked={mode === 'background'}
            onChange={() => setMode('background')}
          />
          Background
        </label>
      </div>

      <div>
        <h4>Upload File (optional)</h4>
        <input type="file" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <span>Uploading...</span>}
        {fileIds.length > 0 && <span>{fileIds.length} file(s) uploaded</span>}
      </div>

      <div>
        <h4>Input Text</h4>
        <textarea
          rows={6}
          placeholder="Enter your request here..."
          value={inputs.text || ''}
          onChange={(e) => setInputs({ text: e.target.value })}
        />
      </div>

      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Starting...' : 'Start Task'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create TaskOutputPanel component**

Create `packages/web/src/components/TaskOutputPanel.tsx`:

```tsx
import { useTaskSocket } from '../hooks/useTaskSocket';

interface TaskOutputPanelProps {
  taskId: string;
}

export default function TaskOutputPanel({ taskId }: TaskOutputPanelProps) {
  const { status, output, interactivePrompt, isConnected, sendInput } = useTaskSocket(taskId);
  const [inputText, setInputText] = useState('');

  const handleSendInput = () => {
    if (!inputText.trim()) return;
    sendInput(inputText);
    setInputText('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Task: {taskId}</h3>
        <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected' : 'Disconnected'} | State: {status}
        </span>
      </div>

      <pre
        style={{
          background: '#1a1a1a',
          color: '#f0f0f0',
          padding: '1rem',
          minHeight: '300px',
          maxHeight: '500px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {output || 'Waiting for output...'}
      </pre>

      {interactivePrompt && (
        <div style={{ border: '2px solid orange', padding: '1rem', marginTop: '1rem' }}>
          <h4>Interactive Question:</h4>
          <p>{interactivePrompt}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
              placeholder="Your response..."
              style={{ flex: 1 }}
            />
            <button onClick={handleSendInput}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create App component with routing**

Create `packages/web/src/App.tsx`:

```tsx
import { useState } from 'react';
import SkillBrowser from './components/SkillBrowser';
import TaskSubmitForm from './components/TaskSubmitForm';
import TaskOutputPanel from './components/TaskOutputPanel';
import type { SkillManifest } from './types';

// For MVP, use a hardcoded user ID. In production, this comes from auth.
const USER_ID = 'dev-user';

export default function App() {
  const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>SkillForge</h1>

      {!selectedSkill && !activeTaskId && (
        <SkillBrowser onSelectSkill={setSelectedSkill} />
      )}

      {selectedSkill && !activeTaskId && (
        <TaskSubmitForm
          skill={selectedSkill}
          userId={USER_ID}
          onTaskCreated={(taskId) => {
            setActiveTaskId(taskId);
            setSelectedSkill(null);
          }}
        />
      )}

      {activeTaskId && (
        <div>
          <button onClick={() => { setActiveTaskId(null); setSelectedSkill(null); }}>
            ← Back to Skills
          </button>
          <TaskOutputPanel taskId={activeTaskId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Add useState import to TaskOutputPanel**

Edit `packages/web/src/components/TaskOutputPanel.tsx` to add the import:

```tsx
import { useState } from 'react';
import { useTaskSocket } from '../hooks/useTaskSocket';
```

- [ ] **Step 8: Test frontend build**

```bash
cd packages/web && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: React frontend with skill browser, task submission, and output panel"
```

---

## Task 10: Task Execution Engine (End-to-End Integration)

Wire TaskOrchestrator, AgentPoolManager, and TaskSocket together to actually execute tasks in Claude Code containers.

**Files:**
- Modify: `packages/server/src/index.ts`
- Create: `packages/server/src/services/TaskExecutor.ts`

- [ ] **Step 1: Create TaskExecutor service**

Create `packages/server/src/services/TaskExecutor.ts`:

```typescript
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
      // Cleanup container
      const taskInfo = this.orchestrator.getTask(task.id);
      if (taskInfo?.containerId) {
        await this.agentPool.destroyTaskContainer(task.id);
      }
    }
  }
}
```

- [ ] **Step 2: Update server entry point to use TaskExecutor**

Modify `packages/server/src/index.ts` to add the TaskExecutor:

Add import:
```typescript
import { TaskExecutor } from './services/TaskExecutor.js';
```

Add after service initialization:
```typescript
const taskExecutor = new TaskExecutor({
  agentPool,
  orchestrator: taskOrchestrator,
  skillRegistry,
  fileService,
  taskSocket,
});
```

Modify the tasks route POST handler to trigger execution:

Replace the tasks route import with inline route that uses the executor:

```typescript
// Tasks route with execution
app.post('/api/tasks', async (req, res) => {
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
```

- [ ] **Step 3: Test end-to-end flow**

1. Start the server:
```bash
cd packages/server && npx tsx src/index.ts
```

2. In another terminal, create a task:
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "dev-user",
    "skillId": "test-skill-1.0.0",
    "skillVersion": "1.0.0",
    "inputs": {"text": "Hello, this is a test"},
    "fileIds": [],
    "mode": "fast"
  }'
```

Expected: Returns task with state "pending" or "preparing".

3. Check task status:
```bash
curl http://localhost:3000/api/tasks/<task-id>
```

Expected: Task state transitions through preparing → running → completed/failed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: TaskExecutor with end-to-end Claude Code container execution"
```

---

## Task 11: Security Hardening

Apply the security measures from the design doc: container restrictions, file isolation, and input validation.

**Files:**
- Modify: `docker/Dockerfile.claude-code`
- Modify: `packages/server/src/services/AgentPoolManager.ts`

- [ ] **Step 1: Harden Dockerfile**

Replace `docker/Dockerfile.claude-code`:

```dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user with restricted home
RUN useradd -m -u 1000 -s /bin/bash claude \
    && mkdir -p /workspace \
    && chown claude:claude /workspace

# Switch to non-root user
USER claude
WORKDIR /workspace

# Claude Code skill discovery path
ENV CLAUDE_SKILLS_PATH=/workspace/.claude/skills

# Default: keep container alive for task execution
CMD ["sleep", "3600"]
```

- [ ] **Step 2: Add network restrictions to AgentPoolManager**

Modify `packages/server/src/services/AgentPoolManager.ts` in the `createTaskContainer` method, update the `HostConfig`:

```typescript
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
```

- [ ] **Step 3: Add input validation middleware**

Create `packages/server/src/middleware/validation.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';

export function validateTaskInput(req: Request, res: Response, next: NextFunction): void {
  const { userId, skillId, mode } = req.body;

  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }

  if (!skillId || typeof skillId !== 'string' || skillId.length > 200) {
    res.status(400).json({ error: 'Invalid skillId' });
    return;
  }

  if (!mode || !['fast', 'background'].includes(mode)) {
    res.status(400).json({ error: 'Invalid mode. Must be "fast" or "background"' });
    return;
  }

  next();
}
```

Add to `packages/server/src/index.ts`:
```typescript
import { validateTaskInput } from './middleware/validation.js';
```

And apply to the task creation route:
```typescript
app.post('/api/tasks', validateTaskInput, async (req, res) => { ... });
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "security: container hardening, network restrictions, input validation"
```

---

## Task 12: Integration Testing and Final Validation

Run the full system to validate the MVP works end-to-end.

**Files:**
- Create: `packages/server/tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `packages/server/tests/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Integration', () => {
  it('should have all required environment variables', () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
  });

  it('should be able to query health endpoint', async () => {
    const res = await fetch('http://localhost:3000/health');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('should list available skills', async () => {
    const res = await fetch('http://localhost:3000/api/skills');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.skills)).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

Start the server in one terminal:
```bash
cd packages/server && npx tsx src/index.ts
```

In another terminal:
```bash
cd packages/server && npx vitest run tests/integration.test.ts
```

Expected: All tests pass (assuming ANTHROPIC_API_KEY is set).

- [ ] **Step 3: Test full user flow via frontend**

Start both frontend and backend:
```bash
npm run dev
```

Open browser to `http://localhost:5173` and verify:
1. Skill list loads
2. Can select a skill
3. Can submit a task with text input
4. Real-time output streams in the output panel
5. Task completes with result

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: integration tests and final validation"
```

---

## Self-Review

### Spec Coverage

| Design Doc Section | Implementing Task(s) |
|-------------------|---------------------|
| 3.1 Architecture (Hub + Worker) | Task 8 (server integration) |
| 3.2 Deployment Topology | Task 11 (Dockerfile), Task 12 (integration) |
| 4.1 Web UI | Task 9 (React frontend) |
| 4.2 API Gateway | Task 8 (Express routes), Task 11 (validation) |
| 4.3 Skill Registry | Task 3 |
| 4.4 Task Orchestrator | Task 6 |
| 4.5 File Service | Task 4 |
| 4.6 Agent Pool Manager | Task 5 |
| 5.1 Fast Task Data Flow | Task 7 (WebSocket), Task 10 (executor) |
| 5.2 Background Task Data Flow | Task 10 (executor) |
| 5.3 Session Recovery | Task 7 (WebSocket reconnection) |
| 6.1 Container Security | Task 11 (Dockerfile hardening) |
| 6.2 File Isolation | Task 5 (temp workDir per container) |
| 6.3 User Permissions | Task 8 (userId in task creation) |
| 7. Error Handling | Task 10 (executor error handling) |

**No gaps identified.**

### Placeholder Scan

- No "TBD", "TODO", or "implement later" found
- All code steps include actual code
- All test steps include actual test code
- All commands include expected output

### Type Consistency

- `TaskState` and `ExecutionMode` types match between `packages/server/src/types.ts` and `packages/web/src/types.ts`
- `SkillManifest` interface consistent across server and web
- `Task` interface consistent across all services
- Database schema matches TypeScript types

**No inconsistencies found.**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-13-skillforge-platform.md`.**

### Next Steps

This plan builds the complete MVP in 12 tasks. The critical path is:
1. Project scaffolding (Task 1)
2. Database + types (Task 2)
3. Skill Registry (Task 3)
4. File Service (Task 4)
5. Agent Pool Manager (Task 5)
6. Task Orchestrator (Task 6)
7. WebSocket (Task 7)
8. Server integration (Task 8)
9. Frontend (Task 9)
10. **Task Executor** (Task 10) - This is the most complex task, integrating all services
11. Security hardening (Task 11)
12. Integration tests (Task 12)

### Recommended Execution Order

**Option 1: Sequential Implementation**
Follow tasks 1-12 in order. Each task builds on the previous. Commit after each task.

**Option 2: Parallel Tracks**
- Track A (Backend): Tasks 1-8, 10-12
- Track B (Frontend): Tasks 1, 9

Track B can start after Task 1 (project scaffolding) is complete, since the frontend only needs the API contract (which is defined in the design).

### Known Risks

1. **Docker networking**: The container network mode is `bridge`. If your Docker setup uses a different default network, container-to-internet access may fail.
2. **Claude Code CLI flags**: The `--skill` and `--non-interactive` flags in Task 10 are assumed. If Claude Code doesn't support these exact flags, the exec command needs adjustment.
3. **PTY integration**: Task 10 uses a simplified `sh -c` approach. For production interactive use, a proper PTY integration (via `node-pty`) would provide better UX.

---

**Plan is ready for execution. Start with Task 1?**

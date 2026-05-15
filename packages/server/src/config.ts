import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..', '..');

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  rootDir,
  skillsDir: process.env.SKILLFORGE_SKILLS_DIR || join(rootDir, 'skills'),
  uploadsDir: process.env.SKILLFORGE_UPLOADS_DIR || join(rootDir, 'uploads'),
  resultsDir: process.env.SKILLFORGE_RESULTS_DIR || join(rootDir, 'results'),
  dbPath: process.env.SKILLFORGE_DB || join(rootDir, 'data', 'skillforge.db'),
  webDistDir: join(rootDir, 'packages', 'web', 'dist'),
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '3'),
  containerMemoryLimit: parseInt(process.env.CONTAINER_MEMORY_LIMIT || '4294967296'),
  containerCpuLimit: parseInt(process.env.CONTAINER_CPU_LIMIT || '2'),
  taskTimeoutSeconds: parseInt(process.env.TASK_TIMEOUT_SECONDS || '1800'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  mockExecution: process.env.MOCK_EXECUTION === 'true',
};

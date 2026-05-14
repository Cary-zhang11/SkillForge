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

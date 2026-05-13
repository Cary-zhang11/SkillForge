import { describe, it, expect, beforeAll } from 'vitest';
import { AgentPoolManager } from '../src/services/AgentPoolManager.js';

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

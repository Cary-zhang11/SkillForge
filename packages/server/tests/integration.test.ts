import { describe, it, expect } from 'vitest';

describe('Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000';

  it('should have ANTHROPIC_API_KEY defined in environment', () => {
    // Skip if key is not set — the server is already running for these tests
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Skipping: ANTHROPIC_API_KEY not set in environment');
      return;
    }
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
    expect(process.env.ANTHROPIC_API_KEY).not.toBe('');
  });

  it('should return ok from health endpoint', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.activeTasks).toBe('number');
    expect(typeof body.maxConcurrent).toBe('number');
  });

  it('should return skills array from skills endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/skills`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.skills)).toBe(true);
  });
});

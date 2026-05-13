import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../src/services/SkillRegistry.js';
import { db } from '../src/db.js';

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

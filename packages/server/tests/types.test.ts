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

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

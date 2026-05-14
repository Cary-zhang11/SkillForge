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

router.post('/scan', (_req, res) => {
  registry.scanAndRegister();
  const skills = registry.listSkills();
  res.json({ skills, message: 'Skills rescanned' });
});

export default router;

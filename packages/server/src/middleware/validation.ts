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

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

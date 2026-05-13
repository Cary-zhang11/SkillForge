import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { StoredFile } from '../types.js';

const UPLOADS_DIR = process.env.SKILLFORGE_UPLOADS_DIR || join(process.cwd(), 'uploads');
const RESULTS_DIR = process.env.SKILLFORGE_RESULTS_DIR || join(process.cwd(), 'results');

export class FileService {
  constructor() {
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  }

  saveUpload(originalName: string, mimeType: string, buffer: Buffer): StoredFile {
    const id = uuidv4();
    const fileName = `${id}-${originalName}`;
    const filePath = join(UPLOADS_DIR, fileName);

    writeFileSync(filePath, buffer);

    const file: StoredFile = {
      id,
      originalName,
      mimeType,
      size: buffer.length,
      path: filePath,
      uploadedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO files (id, original_name, mime_type, size, path, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, originalName, mimeType, buffer.length, filePath, file.uploadedAt);

    return file;
  }

  async saveResult(taskId: string, fileName: string, buffer: Buffer): Promise<StoredFile> {
    const id = uuidv4();
    const resultPath = join(RESULTS_DIR, taskId);
    if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

    const filePath = join(resultPath, fileName);
    writeFileSync(filePath, buffer);

    const file: StoredFile = {
      id,
      originalName: fileName,
      mimeType: 'application/octet-stream',
      size: buffer.length,
      path: filePath,
      uploadedAt: Date.now(),
      taskId,
    };

    const stmt = db.prepare(`
      INSERT INTO files (id, original_name, mime_type, size, path, uploaded_at, task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, fileName, file.mimeType, buffer.length, filePath, file.uploadedAt, taskId);

    return file;
  }

  getFile(id: string): StoredFile | null {
    const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      original_name: string;
      mime_type: string;
      size: number;
      path: string;
      uploaded_at: number;
      task_id: string | null;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      path: row.path,
      uploadedAt: row.uploaded_at,
      taskId: row.task_id || undefined,
    };
  }

  getFilePath(id: string): string | null {
    const file = this.getFile(id);
    return file?.path || null;
  }

  linkFilesToTask(fileIds: string[], taskId: string): void {
    const stmt = db.prepare('UPDATE files SET task_id = ? WHERE id = ?');
    for (const fileId of fileIds) {
      stmt.run(taskId, fileId);
    }
  }
}

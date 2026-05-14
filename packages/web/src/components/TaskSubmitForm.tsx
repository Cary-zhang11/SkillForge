import { useState } from 'react';
import { createTask, uploadFile } from '../api.js';
import type { SkillManifest } from '../types.js';

interface TaskSubmitFormProps {
  skill: SkillManifest;
  userId: string;
  onTaskCreated: (taskId: string) => void;
}

export default function TaskSubmitForm({ skill, userId, onTaskCreated }: TaskSubmitFormProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'fast' | 'background'>('fast');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileIds((prev) => [...prev, result.file.id]);
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (skill.interactive && mode === 'background') {
      alert('Interactive skills cannot run in background mode');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTask({
        userId,
        skillId: skill.id,
        skillVersion: skill.version,
        inputs,
        fileIds,
        mode,
      });
      onTaskCreated(result.task.id);
    } catch (err) {
      alert('Failed to create task: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Run: {skill.name}</h2>
      <p>{skill.description}</p>

      <div>
        <label>
          <input
            type="radio"
            value="fast"
            checked={mode === 'fast'}
            onChange={() => setMode('fast')}
          />
          Fast (real-time)
        </label>
        <label>
          <input
            type="radio"
            value="background"
            checked={mode === 'background'}
            onChange={() => setMode('background')}
          />
          Background
        </label>
      </div>

      <div>
        <h4>Upload File (optional)</h4>
        <input type="file" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <span>Uploading...</span>}
        {fileIds.length > 0 && <span>{fileIds.length} file(s) uploaded</span>}
      </div>

      <div>
        <h4>Input Text</h4>
        <textarea
          rows={6}
          placeholder="Enter your request here..."
          value={inputs.text || ''}
          onChange={(e) => setInputs({ text: e.target.value })}
        />
      </div>

      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Starting...' : 'Start Task'}
      </button>
    </div>
  );
}

import { useState } from 'react';
import { createTask, uploadFile } from '../api.js';
import type { SkillManifest } from '../types.js';

interface TaskSubmitFormProps {
  skill: SkillManifest;
  userId: string;
  onTaskCreated: (taskId: string) => void;
  onBack: () => void;
}

export default function TaskSubmitForm({ skill, userId, onTaskCreated, onBack }: TaskSubmitFormProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [mode, setMode] = useState<'fast' | 'background'>('fast');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileIds((prev) => [...prev, result.file.id]);
      setFileNames((prev) => [...prev, file.name]);
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const removeFile = (index: number) => {
    setFileIds((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
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
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || uploading;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Skill Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{skill.name}</h2>
            <p className="text-slate-500 mt-1">{skill.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-mono rounded-lg">
              v{skill.version}
            </span>
            {skill.interactive && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg">
                Interactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Execution Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('fast')}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                mode === 'fast'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === 'fast' ? 'border-primary' : 'border-slate-300'
                }`}>
                  {mode === 'fast' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="font-semibold text-slate-800">Fast</span>
              </div>
              <p className="text-sm text-slate-500 ml-6">Real-time streaming with WebSocket</p>
            </button>

            <button
              type="button"
              onClick={() => setMode('background')}
              disabled={skill.interactive}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                mode === 'background'
                  ? 'border-primary bg-primary/5'
                  : skill.interactive
                  ? 'border-slate-100 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === 'background' ? 'border-primary' : 'border-slate-300'
                }`}>
                  {mode === 'background' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="font-semibold text-slate-800">Background</span>
              </div>
              <p className="text-sm text-slate-500 ml-6">
                {skill.interactive ? 'Not available for interactive skills' : 'Run asynchronously, get notified when done'}
              </p>
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Upload Files (optional)
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="text-3xl mb-2">📎</div>
            <p className="text-slate-600 mb-1">
              {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-slate-400 text-sm">Support for text, code, images, PDFs</p>
            <input
              type="file"
              onChange={handleFileInput}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer text-sm"
            >
              Select File
            </label>
          </div>

          {/* File List */}
          {fileNames.length > 0 && (
            <div className="mt-3 space-y-2">
              {fileNames.map((name, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-slate-700 truncate">{name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-error transition-colors ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Text */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Input
          </label>
          <textarea
            rows={8}
            placeholder="Enter your request, code, or description here..."
            value={inputs.text || ''}
            onChange={(e) => setInputs({ text: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-vertical font-mono text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={onBack}
            className="px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
          >
            ← Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                🚀 Start Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '/api';

export async function fetchSkills() {
  const res = await fetch(`${API_BASE}/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function fetchSkill(id: string) {
  const res = await fetch(`${API_BASE}/skills/${id}`);
  if (!res.ok) throw new Error('Failed to fetch skill');
  return res.json();
}

export async function createTask(data: {
  userId: string;
  skillId: string;
  skillVersion: string;
  inputs: Record<string, string>;
  fileIds: string[];
  mode: 'fast' | 'background';
}) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function fetchTask(id: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

import { useState } from 'react';
import SkillBrowser from './components/SkillBrowser.js';
import TaskSubmitForm from './components/TaskSubmitForm.js';
import TaskOutputPanel from './components/TaskOutputPanel.js';
import type { SkillManifest } from './types.js';

// For MVP, use a hardcoded user ID. In production, this comes from auth.
const USER_ID = 'dev-user';

export default function App() {
  const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>SkillForge</h1>

      {!selectedSkill && !activeTaskId && (
        <SkillBrowser onSelectSkill={setSelectedSkill} />
      )}

      {selectedSkill && !activeTaskId && (
        <TaskSubmitForm
          skill={selectedSkill}
          userId={USER_ID}
          onTaskCreated={(taskId: string) => {
            setActiveTaskId(taskId);
            setSelectedSkill(null);
          }}
        />
      )}

      {activeTaskId && (
        <div>
          <button onClick={() => { setActiveTaskId(null); setSelectedSkill(null); }}>
            &larr; Back to Skills
          </button>
          <TaskOutputPanel taskId={activeTaskId} />
        </div>
      )}
    </div>
  );
}

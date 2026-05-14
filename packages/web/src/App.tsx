import { useState } from 'react';
import SkillBrowser from './components/SkillBrowser.js';
import TaskSubmitForm from './components/TaskSubmitForm.js';
import TaskOutputPanel from './components/TaskOutputPanel.js';
import type { SkillManifest } from './types.js';

type Page = 'skills' | 'tasks' | 'files';

const USER_ID = 'dev-user';

export default function App() {
  const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('skills');

  const handleBack = () => {
    setActiveTaskId(null);
    setSelectedSkill(null);
    setPage('skills');
  };

  const handleTaskCreated = (taskId: string) => {
    setActiveTaskId(taskId);
    setSelectedSkill(null);
  };

  return (
    <div className="min-h-screen bg-bg-page flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-sidebar text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-sm">SF</span>
            SkillForge
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => { setPage('skills'); handleBack(); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              page === 'skills' ? 'bg-primary/20 text-primary-light' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>🛠️</span> Skills
          </button>
          <button
            onClick={() => setPage('tasks')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              page === 'tasks' ? 'bg-primary/20 text-primary-light' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>📋</span> Tasks
          </button>
          <button
            onClick={() => setPage('files')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              page === 'files' ? 'bg-primary/20 text-primary-light' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>📁</span> Files
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white font-medium">
              D
            </div>
            <span>dev-user</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {activeTaskId && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
              >
                ← Back
              </button>
            )}
            {activeTaskId && <span className="text-slate-300">/</span>}
            <span className="capitalize">{page}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            <span className="text-sm text-slate-600">Server Online</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          {!activeTaskId && !selectedSkill && page === 'skills' && (
            <SkillBrowser onSelectSkill={setSelectedSkill} />
          )}

          {selectedSkill && !activeTaskId && (
            <TaskSubmitForm
              skill={selectedSkill}
              userId={USER_ID}
              onTaskCreated={handleTaskCreated}
              onBack={handleBack}
            />
          )}

          {activeTaskId && (
            <TaskOutputPanel taskId={activeTaskId} onBack={handleBack} />
          )}

          {page === 'tasks' && !activeTaskId && !selectedSkill && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">Task History</h2>
              <p className="text-slate-500">View your past tasks and results here.</p>
              <p className="text-slate-400 text-sm mt-2">(Coming soon)</p>
            </div>
          )}

          {page === 'files' && !activeTaskId && !selectedSkill && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">Files</h2>
              <p className="text-slate-500">Manage your uploaded and result files.</p>
              <p className="text-slate-400 text-sm mt-2">(Coming soon)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>SkillForge v0.1.0</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            System Normal
          </span>
        </footer>
      </main>
    </div>
  );
}

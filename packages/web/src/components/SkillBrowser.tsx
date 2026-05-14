import { useState, useEffect } from 'react';
import { RefreshCw, Search, FolderOpen, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { fetchSkills } from '../api.js';
import type { SkillManifest } from '../types.js';

interface SkillBrowserProps {
  onSelectSkill: (skill: SkillManifest) => void;
}

export default function SkillBrowser({ onSelectSkill }: SkillBrowserProps) {
  const [skills, setSkills] = useState<SkillManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);

  const loadSkills = () => {
    setLoading(true);
    setError('');
    fetchSkills()
      .then((data: { skills: SkillManifest[] }) => setSkills(data.skills))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleScan = () => {
    setScanning(true);
    fetch('/api/skills/scan', { method: 'POST' })
      .then(() => loadSkills())
      .catch((err: Error) => setError(err.message))
      .finally(() => setScanning(false));
  };

  const filtered = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-full max-w-md bg-slate-200 rounded-lg mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-error" />
          <h3 className="text-lg font-semibold text-error mb-2">Failed to load skills</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadSkills}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (skills.length === 0) {
    return (
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Select a Skill</h2>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Refresh Skills
              </>
            )}
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No Skills Found</h3>
          <p className="text-slate-500 mb-2">Place your skill folders in the</p>
          <code className="bg-slate-100 px-2 py-1 rounded text-sm">skills/</code>
          <p className="text-slate-400 text-sm mt-4">Each skill folder should contain SKILL.md and skill.yaml</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Select a Skill</h2>
          <p className="text-slate-500 mt-1">Choose a skill to start a task. {skills.length} skill{skills.length !== 1 ? 's' : ''} available.</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" /> Refresh
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search skills by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
        />
      </div>

      {/* Skill Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((skill) => (
          <div
            key={skill.id}
            onClick={() => onSelectSkill(skill)}
            className="group bg-white border border-slate-200 rounded-xl p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-primary transition-colors">
                {skill.name}
              </h3>
              {skill.interactive && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Interactive
                </span>
              )}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3">
              {skill.description}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono bg-slate-100 px-2 py-1 rounded">v{skill.version}</span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Start <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* No search results */}
      {filtered.length === 0 && search && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No skills match &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}

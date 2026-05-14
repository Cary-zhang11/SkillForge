import { useState, useEffect } from 'react';
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

  if (loading) return <div>Loading skills...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Select a Skill</h2>
        <button onClick={handleScan} disabled={scanning}>
          {scanning ? 'Scanning...' : 'Refresh Skills'}
        </button>
      </div>
      <input
        type="text"
        placeholder="Search skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {filtered.map((skill) => (
          <div
            key={skill.id}
            onClick={() => onSelectSkill(skill)}
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <h3>{skill.name}</h3>
            <p>{skill.description}</p>
            <small>v{skill.version} {skill.interactive ? '(Interactive)' : ''}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

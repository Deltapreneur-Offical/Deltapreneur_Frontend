import { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'ADVANCED', label: 'Advanced', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'EXPERT', label: 'Expert', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const POPULAR_SKILLS = [
  'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'Go', 'Rust',
  'HTML/CSS', 'Vue.js', 'Angular', 'Swift', 'Kotlin', 'Flutter', 'React Native',
  'UI/UX Design', 'Figma', 'Adobe XD', 'Sketch', 'Product Design', 'UX Research',
  'Product Management', 'Agile', 'Scrum', 'Marketing', 'Growth Hacking', 'SEO',
  'Content Writing', 'Copywriting', 'Sales', 'Business Development', 'Finance',
  'Data Analysis', 'Machine Learning', 'AI', 'AWS', 'Docker', 'Kubernetes',
  'DevOps', 'QA Testing', 'Security', 'Blockchain', 'Web3', 'Mobile Development',
  'Backend Development', 'Frontend Development', 'Full Stack',
];

export default function SkillsInput({ skills, onChange, placeholder = 'Search skills...' }) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeLevel, setActiveLevel] = useState('INTERMEDIATE');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const skillEntries = Array.isArray(skills) ? skills : (skills ? skills.split(',').filter(Boolean) : []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSkills = POPULAR_SKILLS.filter(
    (skill) => skill.toLowerCase().includes(inputValue.toLowerCase()) &&
    !skillEntries.some((entry) => {
      const s = typeof entry === 'string' ? entry : entry?.skill;
      return s?.toLowerCase() === skill.toLowerCase();
    })
  ).slice(0, 8);

  const addSkill = (skillName) => {
    if (!skillName.trim()) return;
    const newSkill = { skill: skillName.trim(), level: activeLevel };
    onChange([...skillEntries, newSkill]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeSkill = (index) => {
    onChange(skillEntries.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addSkill(inputValue);
    }
  };

  const updateSkillLevel = (index, newLevel) => {
    onChange(skillEntries.map((entry, i) => i === index ? { ...entry, level: newLevel } : entry));
  };

  const getLevelStyle = (level) => {
    const found = SKILL_LEVELS.find((l) => l.value === level);
    return found ? found.color : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Skills
        </label>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              aria-label="Search skills"
            />
            {showSuggestions && inputValue && (
              <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                {filteredSkills.length > 0 ? (
                  filteredSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      {skill}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => addSkill(inputValue)}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border-b border-gray-100"
                  >
                    Add "{inputValue}"
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 hidden sm:block">Level:</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Skill proficiency level">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setActiveLevel(level.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    activeLevel === level.value
                      ? `${level.color} ring-2 ring-offset-1 ring-indigo-300`
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  role="radio"
                  aria-checked={activeLevel === level.value}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {skillEntries.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Skills ({skillEntries.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {skillEntries.map((entry, index) => {
              const skillName = typeof entry === 'string' ? entry : entry?.skill;
              const skillLevel = typeof entry === 'string' ? 'INTERMEDIATE' : entry?.level || 'INTERMEDIATE';
              return (
                <div
                  key={`${skillName}-${index}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 shadow-sm hover:shadow-md transition-all"
                >
                  <span>{skillName}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getLevelStyle(skillLevel)}`}>
                      {SKILL_LEVELS.find(l => l.value === skillLevel)?.label || skillLevel}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="p-0.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all"
                      aria-label={`Remove ${skillName}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
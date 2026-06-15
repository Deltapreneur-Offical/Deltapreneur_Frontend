import { formatEquityPercent } from '../../constants/ventureLabels';

const DEFAULT_MEMBER = () => ({
  name: '',
  role: '',
  equityPercent: '',
  linkedinUrl: '',
});

export const EMPTY_TEAM_MEMBERS = [DEFAULT_MEMBER()];

export function normalizeTeamMembers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return EMPTY_TEAM_MEMBERS.map((m) => ({ ...m }));
  }
  return raw.map((member) => ({
    name: member.name ?? member.fullName ?? '',
    role: member.role ?? member.title ?? '',
    equityPercent: member.equityPercent ?? member.equity_percent ?? '',
    linkedinUrl: member.linkedinUrl ?? member.linkedin_url ?? '',
  }));
}

export function sanitizeTeamMembersForApi(members) {
  if (!Array.isArray(members)) return [];
  return members
    .filter((m) => String(m.name || '').trim() && String(m.role || '').trim())
    .map((m) => ({
      name: String(m.name).trim(),
      role: String(m.role).trim(),
      equityPercent: Number(m.equityPercent),
      linkedinUrl: String(m.linkedinUrl || '').trim() || null,
    }))
    .filter((m) => Number.isFinite(m.equityPercent) && m.equityPercent > 0 && m.equityPercent <= 100);
}

export function totalTeamEquityPercent(members) {
  return (members || []).reduce((sum, member) => {
    const value = Number(member.equityPercent);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

export default function TeamMembersSection({
  members,
  onChange,
  inputCls,
  labelCls = 'text-sm font-medium text-gray-700',
}) {
  const rows = normalizeTeamMembers(members);
  const totalEquity = totalTeamEquityPercent(rows);
  const overAllocated = totalEquity > 100;

  const updateRow = (index, key, value) => {
    const next = rows.map((row, idx) => (idx === index ? { ...row, [key]: value } : row));
    onChange(next);
  };

  const addRow = () => onChange([...rows, DEFAULT_MEMBER()]);
  const removeRow = (index) => {
    const next = rows.filter((_, idx) => idx !== index);
    onChange(next.length ? next : [DEFAULT_MEMBER()]);
  };

  return (
    <div className="flex flex-col gap-4">
      {rows.map((member, index) => (
        <div key={index} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Team member {index + 1}</div>
            {rows.length > 1 && (
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={() => removeRow(index)}
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Name <span className="text-red-400">*</span></span>
              <input
                value={member.name}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Role <span className="text-red-400">*</span></span>
              <input
                value={member.role}
                onChange={(e) => updateRow(index, 'role', e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Equity % <span className="text-red-400">*</span></span>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={member.equityPercent}
                onChange={(e) => updateRow(index, 'equityPercent', e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>LinkedIn URL</span>
              <input
                type="url"
                value={member.linkedinUrl}
                onChange={(e) => updateRow(index, 'linkedinUrl', e.target.value)}
                className={inputCls}
                placeholder="https://linkedin.com/in/..."
              />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-glow btn-glow-sm" onClick={addRow}>
          + Add Member
        </button>
        <div className={`text-sm ${overAllocated ? 'text-amber-700' : 'text-gray-600'}`}>
          Total Team Equity: {formatEquityPercent(totalEquity) || '0'}%
          {overAllocated ? ' — exceeds 100%' : ''}
        </div>
      </div>
    </div>
  );
}

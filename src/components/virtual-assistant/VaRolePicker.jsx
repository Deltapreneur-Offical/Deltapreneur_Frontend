import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  VA_CUSTOM_ROLE_MAX_LEN,
  VA_ROLE_OTHER,
  VIRTUAL_ASSISTANT_ROLES,
} from '../../constants/virtualAssistantRoles';

/**
 * Searchable DeltaOperator role picker with "Other (Specify Your Role)" + custom input.
 * Trigger stays visible; dropdown + search open below it.
 */
export default function VaRolePicker({
  selectedRole = '',
  customRole = '',
  onSelectRole,
  onCustomRoleChange,
  error = null,
  customError = null,
  label = 'Select DeltaOperator Role',
  required = true,
  inputClassName = '',
  labelClassName = 'va-app-label',
  errorClassName = 'va-app-error',
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return VIRTUAL_ASSISTANT_ROLES;
    return VIRTUAL_ASSISTANT_ROLES.filter((role) => role.toLowerCase().includes(q));
  }, [search]);

  const selectRole = (role) => {
    onSelectRole?.(role);
    if (role !== VA_ROLE_OTHER) {
      onCustomRoleChange?.('');
    }
    setOpen(false);
    setSearch('');
  };

  const commitUnknownAsOther = () => {
    const typed = search.trim();
    if (!typed) return;
    if (typed === VA_ROLE_OTHER) {
      selectRole(VA_ROLE_OTHER);
      return;
    }
    const exact = VIRTUAL_ASSISTANT_ROLES.find(
      (role) => role.toLowerCase() === typed.toLowerCase(),
    );
    if (exact) {
      selectRole(exact);
      return;
    }
    onSelectRole?.(VA_ROLE_OTHER);
    onCustomRoleChange?.(typed.slice(0, VA_CUSTOM_ROLE_MAX_LEN));
    setOpen(false);
    setSearch('');
  };

  const displayValue = selectedRole
    ? selectedRole === VA_ROLE_OTHER
      ? VA_ROLE_OTHER
      : selectedRole
    : '';
  const showOther = selectedRole === VA_ROLE_OTHER;
  const hasError = Boolean(error);

  const triggerClass =
    inputClassName ||
    `w-full rounded-lg border bg-white px-4 py-3 text-left text-gray-900 transition-all focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:ring-purple-500'
    }`;

  return (
    <div className="va-app-field" ref={rootRef}>
      <label className={labelClassName}>
        {label}{required ? <span className="va-app-required"> *</span> : null}
      </label>

      {/* relative wrapper is NOT flex — keeps dropdown anchored under the trigger */}
      <div className="relative w-full">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="va-role-search-results"
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (!next) setSearch('');
              return next;
            });
          }}
          className={`${triggerClass} flex items-center justify-between gap-2`}
        >
          <span className={displayValue ? 'truncate text-gray-900' : 'truncate text-gray-400'}>
            {displayValue || 'Select a role'}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open ? (
          <div
            id="va-role-search-results"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            role="listbox"
          >
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitUnknownAsOther();
                    }
                  }}
                  placeholder="Search roles..."
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1">
              {filteredRoles.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">
                  No matching roles. Press Enter to use as custom, or choose Other.
                </p>
              ) : (
                filteredRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                      selectedRole === role
                        ? 'bg-purple-50 font-semibold text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectRole(role)}
                    role="option"
                    aria-selected={selectedRole === role}
                  >
                    <span>{role}</span>
                    {selectedRole === role ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                ))
              )}
              <button
                type="button"
                className={`mt-1 flex w-full items-center justify-between rounded-md border-t border-gray-100 px-3 py-2 text-left text-sm font-semibold transition ${
                  selectedRole === VA_ROLE_OTHER
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectRole(VA_ROLE_OTHER)}
                role="option"
                aria-selected={selectedRole === VA_ROLE_OTHER}
              >
                <span>{VA_ROLE_OTHER}</span>
                {selectedRole === VA_ROLE_OTHER ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <span className={errorClassName}>{error}</span> : null}

      {showOther ? (
        <div className="mt-1">
          <label className={labelClassName}>
            Enter Your Role<span className="va-app-required"> *</span>
          </label>
          <input
            type="text"
            value={customRole}
            onChange={(e) => onCustomRoleChange?.(e.target.value.slice(0, VA_CUSTOM_ROLE_MAX_LEN))}
            maxLength={VA_CUSTOM_ROLE_MAX_LEN}
            placeholder="e.g. Blockchain Developer, Medical Billing Specialist"
            className={
              inputClassName
                ? `${inputClassName}${customError ? ' border-red-500 focus:ring-red-500' : ''}`
                : `mt-1 w-full rounded-lg border bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 ${
                    customError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-purple-500'
                  }`
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            {String(customRole || '').trim().length}/{VA_CUSTOM_ROLE_MAX_LEN} characters
          </p>
          {customError ? <span className={errorClassName}>{customError}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

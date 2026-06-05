import { useEffect, useMemo, useState } from 'react';

function toLocalDateInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimeInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(isoLocal) {
  if (!isoLocal) return '';
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Date + time picker with an explicit confirm step (fixes native picker UX on mobile/desktop).
 */
export default function MeetingDateTimePicker({
  value,
  onChange,
  minDateTime,
  maxDateTime,
  disabled = false,
  onValidationError,
}) {
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('');
  const [draftError, setDraftError] = useState('');

  const minDate = minDateTime ? minDateTime.slice(0, 10) : '';
  const maxDate = maxDateTime ? maxDateTime.slice(0, 10) : '';

  useEffect(() => {
    if (!value) {
      setDatePart('');
      setTimePart('');
      return;
    }
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      setDatePart(toLocalDateInputValue(d));
      setTimePart(toLocalTimeInputValue(d));
    }
  }, [value]);

  const rangeInvalid = useMemo(() => {
    if (!minDateTime || !maxDateTime) return false;
    return new Date(maxDateTime) < new Date(minDateTime);
  }, [minDateTime, maxDateTime]);

  const validateAndConfirm = () => {
    if (!datePart || !timePart) {
      const msg = 'Please select both date and time, then click Confirm.';
      setDraftError(msg);
      onValidationError?.(msg);
      return;
    }

    const combined = `${datePart}T${timePart}`;
    const selected = new Date(combined);

    if (Number.isNaN(selected.getTime())) {
      const msg = 'Invalid date or time.';
      setDraftError(msg);
      onValidationError?.(msg);
      return;
    }

    if (minDateTime && selected < new Date(minDateTime)) {
      const msg = 'Meeting must be at least 1 hour from now.';
      setDraftError(msg);
      onValidationError?.(msg);
      return;
    }

    if (maxDateTime && !rangeInvalid && selected > new Date(maxDateTime)) {
      const msg = 'Meeting must be scheduled before the auction ends.';
      setDraftError(msg);
      onValidationError?.(msg);
      return;
    }

    setDraftError('');
    onValidationError?.('');
    onChange(combined);
  };

  const clearSelection = () => {
    setDatePart('');
    setTimePart('');
    setDraftError('');
    onValidationError?.('');
    onChange('');
  };

  return (
    <div className="flex flex-col gap-2">
      {rangeInvalid && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Auction end time has passed — pick any future slot at least 1 hour from now.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Date *</label>
          <input
            type="date"
            value={datePart}
            min={minDate}
            max={maxDate || undefined}
            disabled={disabled}
            onChange={(e) => {
              setDatePart(e.target.value);
              setDraftError('');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Time *</label>
          <div className="relative meeting-time-field">
            {!timePart && (
              <span
                className="meeting-time-field__placeholder pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400"
                aria-hidden
              >
                HH:MM
              </span>
            )}
            <input
              type="time"
              value={timePart}
              disabled={disabled}
              onChange={(e) => {
                setTimePart(e.target.value);
                setDraftError('');
              }}
              aria-label="Time in 24-hour format (HH:MM)"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400 ${
                !timePart ? 'meeting-time-field__input--empty' : ''
              }`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={validateAndConfirm}
          className="btn-glow btn-glow-sm"
        >
          Confirm date & time
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={clearSelection}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {value ? (
        <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <span className="font-semibold">Selected: </span>
          {formatDisplay(value)}
        </p>
      ) : (
        <p className="text-xs text-gray-500">Choose date and time, then confirm your selection.</p>
      )}

      {draftError && <p className="text-xs text-red-600 font-semibold">{draftError}</p>}
    </div>
  );
}

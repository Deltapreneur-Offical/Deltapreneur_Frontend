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

function splitDateParts(dateStr) {
  if (!dateStr) return { year: '', month: '', day: '' };
  const [year, month, day] = dateStr.split('-');
  return { year: year || '', month: month || '', day: day || '' };
}

function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
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

  const { year: selectedYear, month: selectedMonth, day: selectedDay } = splitDateParts(datePart);

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

  const yearOptions = useMemo(() => {
    const nowYear = new Date().getFullYear();
    const startYear = minDate ? Number(minDate.slice(0, 4)) : nowYear;
    const endYear = maxDate && !rangeInvalid
      ? Number(maxDate.slice(0, 4))
      : startYear + 5;
    const years = [];
    for (let year = startYear; year <= endYear; year += 1) {
      years.push(year);
    }
    return years;
  }, [minDate, maxDate, rangeInvalid]);

  const monthOptions = useMemo(() => {
    const months = [];
    for (let month = 1; month <= 12; month += 1) {
      const monthStr = String(month).padStart(2, '0');
      const candidate = selectedYear
        ? `${selectedYear}-${monthStr}-01`
        : null;
      if (candidate && minDate && candidate.slice(0, 7) < minDate.slice(0, 7)) continue;
      if (candidate && maxDate && !rangeInvalid && candidate.slice(0, 7) > maxDate.slice(0, 7)) continue;
      months.push(monthStr);
    }
    return months;
  }, [selectedYear, minDate, maxDate, rangeInvalid]);

  const dayOptions = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    const totalDays = daysInMonth(selectedYear, selectedMonth);
    const days = [];
    for (let day = 1; day <= totalDays; day += 1) {
      const dayStr = String(day).padStart(2, '0');
      const candidate = `${selectedYear}-${selectedMonth}-${dayStr}`;
      if (minDate && candidate < minDate) continue;
      if (maxDate && !rangeInvalid && candidate > maxDate) continue;
      days.push(dayStr);
    }
    return days;
  }, [selectedYear, selectedMonth, minDate, maxDate, rangeInvalid]);

  const updateDatePart = (year, month, day) => {
    if (!year || !month || !day) {
      setDatePart('');
      return;
    }
    setDatePart(`${year}-${month}-${day}`);
  };

  const handleYearChange = (year) => {
    const nextMonth = monthOptions.includes(selectedMonth) ? selectedMonth : monthOptions[0] || '';
    const nextDays = year && nextMonth
      ? Array.from({ length: daysInMonth(year, nextMonth) }, (_, i) => String(i + 1).padStart(2, '0'))
        .filter((day) => {
          const candidate = `${year}-${nextMonth}-${day}`;
          if (minDate && candidate < minDate) return false;
          if (maxDate && !rangeInvalid && candidate > maxDate) return false;
          return true;
        })
      : [];
    const nextDay = nextDays.includes(selectedDay) ? selectedDay : nextDays[0] || '';
    updateDatePart(year, nextMonth, nextDay);
    setDraftError('');
  };

  const handleMonthChange = (month) => {
    const nextDays = selectedYear && month
      ? Array.from({ length: daysInMonth(selectedYear, month) }, (_, i) => String(i + 1).padStart(2, '0'))
        .filter((day) => {
          const candidate = `${selectedYear}-${month}-${day}`;
          if (minDate && candidate < minDate) return false;
          if (maxDate && !rangeInvalid && candidate > maxDate) return false;
          return true;
        })
      : [];
    const nextDay = nextDays.includes(selectedDay) ? selectedDay : nextDays[0] || '';
    updateDatePart(selectedYear, month, nextDay);
    setDraftError('');
  };

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

  const selectClassName = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400';

  return (
    <div className="flex flex-col gap-2">
      {rangeInvalid && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Auction end time has passed — pick any future slot at least 1 hour from now.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Date *</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={selectedYear}
              disabled={disabled}
              onChange={(e) => handleYearChange(e.target.value)}
              className={selectClassName}
              aria-label="Year"
            >
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              disabled={disabled || !selectedYear}
              onChange={(e) => handleMonthChange(e.target.value)}
              className={selectClassName}
              aria-label="Month"
            >
              <option value="">Month</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, Number(month) - 1, 1).toLocaleString('en-IN', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={selectedDay}
              disabled={disabled || !selectedYear || !selectedMonth}
              onChange={(e) => {
                updateDatePart(selectedYear, selectedMonth, e.target.value);
                setDraftError('');
              }}
              className={selectClassName}
              aria-label="Day"
            >
              <option value="">Day</option>
              {dayOptions.map((day) => (
                <option key={day} value={day}>{Number(day)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
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

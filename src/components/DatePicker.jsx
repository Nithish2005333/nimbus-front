import { useState, useRef, useEffect } from 'react';
import CustomSelect from './CustomSelect';

// Helper functions
function formatDisplayDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateForInput(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DatePicker({ value, onChange, max, min, error, required, placeholder = "Select date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [selectedYear, setSelectedYear] = useState(currentMonth.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.getMonth());
  const dateInputRef = useRef(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date);
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth());
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) &&
        dateInputRef.current && !dateInputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  const handleDateSelect = (day) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    const dateString = formatDateForInput(newDate);
    setSelectedDate(newDate);
    onChange({ target: { value: dateString } });
    setIsOpen(false);
  };

  const handleInputClick = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleInputFocus = (e) => {
    e.preventDefault();
    setIsOpen(true);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleInputChange = (e) => {
    // Input is read-only, but we need this handler to prevent errors
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isDisabled = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    if (max) {
      const maxDate = new Date(max);
      if (date > maxDate) return true;
    }
    if (min) {
      const minDate = new Date(min);
      if (date < minDate) return true;
    }
    return false;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate years (100 years back from current year)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 100; i--) {
    years.push(i);
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={dateInputRef}
          type="text"
          value={value ? formatDisplayDate(value) : ''}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          required={required}
          readOnly
          className={`w-full input-field text-sm sm:text-base cursor-pointer ${error ? 'border-rose-500/70 focus:border-rose-500/70' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleInputClick}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-cyan-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          ref={calendarRef}
          className="absolute z-[9999] mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-auto min-w-[340px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl p-5 animate-scale-in"
        >
          {/* Year and Month Selectors */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Year
              </label>
              <CustomSelect
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                options={years.map(year => ({ value: year.toString(), label: year.toString() }))}
                placeholder="Select year"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Month
              </label>
              <CustomSelect
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                options={monthNames.map((month, index) => ({ value: index.toString(), label: month }))}
                placeholder="Select month"
                className="text-sm"
              />
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[10px] font-black text-[var(--text-muted)] py-2 uppercase tracking-tighter">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(day)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-xl text-sm font-bold transition-all
                    ${disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : selected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-200 scale-110 z-10'
                        : today
                          ? 'bg-[var(--accent-primary)]/10 text-cyan-700 border border-[var(--accent-primary)]/30'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-color)]'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const todayString = formatDateForInput(today);
                onChange({ target: { value: todayString } });
                setIsOpen(false);
              }}
              className="flex-1 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition border border-[var(--border-color)] shadow-sm"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-slate-800 transition border border-[var(--border-color)] shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

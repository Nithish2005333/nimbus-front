import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ 
  id, 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          selectRef.current && !selectRef.current.contains(event.target)) {
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

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={selectRef}
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full input-field text-sm sm:text-base cursor-pointer text-left flex items-center justify-between ${error ? 'border-rose-500/70 focus:border-rose-500/70' : ''} ${className}`}
      >
        <span className={value ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden animate-scale-in"
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-5 py-3.5 text-sm transition-all ${
                  value === option.value
                    ? 'bg-[var(--accent-primary)]/10 text-cyan-700 font-bold border-l-4 border-cyan-500'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] border-l-4 border-transparent hover:border-[var(--border-color)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


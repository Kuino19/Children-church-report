import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface SmartComboboxProps {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  helperText?: string;
  disabled?: boolean;
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const SmartCombobox: React.FC<SmartComboboxProps> = ({
  label,
  placeholder = 'Select or type to add new...',
  options,
  value,
  onChange,
  helperText,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Normalize on blur
        if (searchTerm) {
          const normalized = toTitleCase(searchTerm);
          setSearchTerm(normalized);
          onChange(normalized);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, onChange]);

  const normalizedInput = toTitleCase(searchTerm);
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const exactMatchExists = options.some(
    opt => opt.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  const isCreatingNew = searchTerm.trim().length > 0 && !exactMatchExists;

  const handleSelect = (selected: string) => {
    setSearchTerm(selected);
    onChange(selected);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleBlur = () => {
    if (searchTerm) {
      const normalized = toTitleCase(searchTerm);
      setSearchTerm(normalized);
      onChange(normalized);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label}
        </label>
        {isCreatingNew && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            <Plus className="w-2.5 h-2.5 mr-0.5" /> Will Create New
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border py-2.5 pl-3 pr-10 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : isCreatingNew
              ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-200 bg-amber-50/20 text-slate-900'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-white text-slate-900'
          }`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {helperText && (
        <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
      )}

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg bg-white p-1 shadow-xl ring-1 ring-black/10 focus:outline-none text-sm">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => {
              const isSelected = opt.toLowerCase() === value.toLowerCase();
              return (
                <div
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before select
                    handleSelect(opt);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                    isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                </div>
              );
            })
          ) : (
            <div className="p-2 text-xs text-slate-500 italic">No existing matches found.</div>
          )}

          {isCreatingNew && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(normalizedInput);
              }}
              className="mt-1 flex cursor-pointer items-center gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 border-t border-amber-200"
            >
              <Plus className="h-3.5 w-3.5 text-amber-700" />
              <span>Create new: <strong className="underline">{normalizedInput}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

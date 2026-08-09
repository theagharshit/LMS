import React from 'react';
import { Check } from 'lucide-react';

interface MultipleChoiceOptionProps {
  optionId: string;
  optionText: string;
  optionIndex: number;
  isSelected: boolean;
  onSelect: (optionText: string) => void;
  disabled?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const MultipleChoiceOption: React.FC<MultipleChoiceOptionProps> = ({
  optionText,
  optionIndex,
  isSelected,
  onSelect,
  disabled = false,
}) => {
  const letter = OPTION_LETTERS[optionIndex] || `${optionIndex + 1}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect(optionText);
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect(optionText)}
      onKeyDown={handleKeyDown}
      className={`group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        disabled
          ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
          : isSelected
            ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100 shadow-md shadow-purple-500/10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-950/20'
      }`}
    >
      <div className="flex items-center gap-3.5 pr-2">
        <div
          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 group-hover:text-purple-700 dark:group-hover:text-purple-300'
          }`}
        >
          {letter}
        </div>
        <span className="font-medium text-sm leading-relaxed">{optionText}</span>
      </div>

      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          isSelected
            ? 'border-purple-600 bg-purple-600 text-white'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
        }`}
      >
        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
    </div>
  );
};

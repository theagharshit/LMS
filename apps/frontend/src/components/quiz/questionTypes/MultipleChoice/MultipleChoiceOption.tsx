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
      className={`group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:ring-offset-2 dark:focus:ring-offset-[#1d281c] ${
        disabled
          ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
          : isSelected
            ? 'border-[#4A6741] bg-[#EBF1E8]/80 dark:bg-[#214126] text-[#2D2D2A] dark:text-emerald-50 shadow-md shadow-[#4A6741]/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1d281c] text-slate-800 dark:text-slate-200 hover:border-[#88A070] dark:hover:border-[#88A070] hover:bg-[#EBF1E8]/30 dark:hover:bg-[#214126]'
      }`}
    >
      <div className="flex items-center gap-3.5 pr-2">
        <div
          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'bg-[#F9F7F2] dark:bg-[#214126] text-[#4A6741] group-hover:bg-[#EBF1E8] group-hover:text-[#4A6741] dark:group-hover:bg-[#88A070]/20 dark:group-hover:text-emerald-300'
          }`}
        >
          {letter}
        </div>
        <span className="font-medium text-sm leading-relaxed">{optionText}</span>
      </div>

      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          isSelected
            ? 'border-[#4A6741] bg-[#4A6741] text-white'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
        }`}
      >
        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
    </div>
  );
};

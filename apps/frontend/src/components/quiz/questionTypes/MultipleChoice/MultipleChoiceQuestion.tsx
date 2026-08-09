import React from 'react';
import { QuestionComponentProps } from '../../types/quizTypes';
import { MultipleChoiceOption } from './MultipleChoiceOption';

export const MultipleChoiceQuestion: React.FC<QuestionComponentProps> = ({
  question,
  answer,
  onAnswer,
  disabled = false,
}) => {
  // Extract options array from data.options or question.options
  const rawOptions = question.data?.options || question.options || [];
  const optionsList: string[] = rawOptions.map((opt: any) =>
    typeof opt === 'string' ? opt : opt.text || String(opt),
  );

  return (
    <div className="space-y-6">
      {/* Question Prompt Card */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Multiple Choice Question • {question.points}{' '}
            {question.points === 1 ? 'Point' : 'Points'}
          </span>
          {question.required && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Required
            </span>
          )}
        </div>
        <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white leading-relaxed">
          {question.prompt}
        </h3>
      </div>

      {/* Options List with WAI-ARIA radiogroup role */}
      <div role="radiogroup" aria-label={question.prompt} className="space-y-3">
        {optionsList.map((optionText, idx) => (
          <MultipleChoiceOption
            key={`${question.id}-opt-${idx}`}
            optionId={`opt-${idx}`}
            optionText={optionText}
            optionIndex={idx}
            isSelected={answer === optionText}
            onSelect={(selected) => onAnswer(question.id, selected)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

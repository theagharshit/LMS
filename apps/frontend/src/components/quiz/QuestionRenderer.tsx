import React from 'react';
import { QuestionComponentProps } from './types/quizTypes';
import { questionTypeRegistry } from './registry/questionTypeRegistry';

export const QuestionRenderer: React.FC<QuestionComponentProps> = (props) => {
  const { question } = props;
  const handler = questionTypeRegistry.getHandler(question.type);

  if (!handler || !handler.renderer) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
        <p className="font-bold">Unsupported Question Type: {question.type}</p>
        <p className="mt-1">No registered renderer found for question type "{question.type}".</p>
      </div>
    );
  }

  const Component = handler.renderer;
  return <Component {...props} />;
};

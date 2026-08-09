import { Question, QuestionTypeContract } from '../../types/quizTypes';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

export const multipleChoiceHandler: QuestionTypeContract = {
  type: 'multiple_choice',
  label: 'Multiple Choice Question',
  renderer: MultipleChoiceQuestion,
  validate: (question: Question, answer: any) => {
    return typeof answer === 'string' && answer.trim().length > 0;
  },
  serializeAnswer: (answer: any) => {
    return typeof answer === 'string' ? answer : '';
  },
  deserializeAnswer: (serialized: string) => {
    return serialized;
  },
  getAnswerSummary: (question: Question, answer: any) => {
    const isCorrect = answer === question.correctAnswer;
    return {
      isCorrect: Boolean(isCorrect),
      displayAnswer: answer || 'Not Answered',
      correctAnswerDisplay: question.correctAnswer || 'N/A',
    };
  },
  calculateScore: (question: Question, answer: any) => {
    return answer === question.correctAnswer ? question.points : 0;
  },
};

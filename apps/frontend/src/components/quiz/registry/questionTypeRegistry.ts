import { QuestionTypeContract } from '../types/quizTypes';
import { multipleChoiceHandler } from '../questionTypes/MultipleChoice/multipleChoiceHandler';

class QuestionTypeRegistry {
  private handlers = new Map<string, QuestionTypeContract>();

  constructor() {
    // Register default question types
    this.register(multipleChoiceHandler);
    // Also register 'MCQ' alias to support shared Prisma backend types
    this.register({
      ...multipleChoiceHandler,
      type: 'MCQ',
    });
  }

  public register(contract: QuestionTypeContract): void {
    this.handlers.set(contract.type.toLowerCase(), contract);
    this.handlers.set(contract.type, contract);
  }

  public getHandler(type: string): QuestionTypeContract | undefined {
    return (
      this.handlers.get(type) ||
      this.handlers.get(type.toLowerCase()) ||
      this.handlers.get('multiple_choice')
    );
  }

  public getSupportedTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const questionTypeRegistry = new QuestionTypeRegistry();

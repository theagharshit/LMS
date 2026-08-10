import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Question } from '../../src/components/quiz/types/quizTypes';
import { questionTypeRegistry } from '../../src/components/quiz/registry/questionTypeRegistry';
import { QuestionRenderer } from '../../src/components/quiz/QuestionRenderer';
import { QuizContainer } from '../../src/components/quiz/QuizContainer';
import { CompletedQuizzesModal } from '../../src/components/student/CompletedQuizzesModal';
import { AppProvider } from '../../src/context/AppContext';

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    type: 'multiple_choice',
    prompt: 'Which data structure provides FIFO ordering?',
    points: 5,
    required: true,
    explanation: 'A Queue provides First-In, First-Out (FIFO) ordering.',
    correctAnswer: 'Queue',
    data: {
      options: ['Stack', 'Queue', 'Tree', 'Graph'],
    },
  },
  {
    id: 'q-2',
    type: 'multiple_choice',
    prompt: 'What is the time complexity of binary search?',
    points: 5,
    required: true,
    explanation: 'Binary search divides search space in half at each step (O(log n)).',
    correctAnswer: 'O(log n)',
    data: {
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
    },
  },
];

describe('LMS Modular Quiz System Suite', () => {
  it('1. questionTypeRegistry contains handlers for multiple_choice and MCQ', () => {
    expect(questionTypeRegistry.getHandler('multiple_choice')).toBeDefined();
    expect(questionTypeRegistry.getHandler('MCQ')).toBeDefined();
  });

  it('2. QuestionRenderer renders MultipleChoiceQuestion prompt and options', () => {
    render(<QuestionRenderer question={mockQuestions[0]} answer={undefined} onAnswer={vi.fn()} />);

    expect(screen.getByText(/Which data structure provides FIFO ordering\?/i)).toBeInTheDocument();
    expect(screen.getByText('Stack')).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
    expect(screen.getByText('Tree')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
  });

  it('3. QuestionRenderer triggers onAnswer when an option card is clicked', () => {
    const handleAnswer = vi.fn();
    render(
      <QuestionRenderer question={mockQuestions[0]} answer={undefined} onAnswer={handleAnswer} />,
    );

    fireEvent.click(screen.getByText('Queue'));
    expect(handleAnswer).toHaveBeenCalledWith('q-1', 'Queue');
  });

  it('4. QuizContainer renders Instructions Landing view initially', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        description="Test your core computer science knowledge"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Data Structures Assessment/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Start Quiz Attempt/i)).toBeInTheDocument();
  });

  it('5. Clicking Start Quiz transitions to active quiz session', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    expect(screen.getByText(/Which data structure provides FIFO ordering\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Question Palette/i)).toBeInTheDocument();
  });

  it('6. Question Navigator palette updates answered count after selection', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    fireEvent.click(screen.getByText('Queue'));

    expect(screen.getByText(/1\/2 Answered/i)).toBeInTheDocument();
  });

  it('7. Flagging button toggles flagged state on question', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    const flagBtn = screen.getByText(/Flag Question/i);
    fireEvent.click(flagBtn);

    expect(screen.getAllByText(/Flagged/i)[0]).toBeInTheDocument();
  });

  it('8. Next Question and Previous navigation buttons work', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    fireEvent.click(screen.getByText(/Next Question/i));

    expect(screen.getByText(/What is the time complexity of binary search\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Previous/i));
    expect(screen.getByText(/Which data structure provides FIFO ordering\?/i)).toBeInTheDocument();
  });

  it('9. Review & Submit opens Submission Confirmation Modal', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    fireEvent.click(screen.getByText(/Next Question/i));
    fireEvent.click(screen.getByText(/Review & Submit/i));

    expect(screen.getByText(/Submit Quiz\?/i)).toBeInTheDocument();
    expect(screen.getByText(/You still have 2 unanswered questions/i)).toBeInTheDocument();
  });

  it('10. Confirming submission triggers onSubmitAnswers callback and displays Score Result screen', () => {
    const handleSubmit = vi.fn();
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        onClose={vi.fn()}
        onSubmitAnswers={handleSubmit}
      />,
    );

    fireEvent.click(screen.getByText(/Start Quiz Attempt/i));
    fireEvent.click(screen.getByText('Queue'));
    fireEvent.click(screen.getByText(/Next Question/i));
    fireEvent.click(screen.getByText('O(log n)'));
    fireEvent.click(screen.getByText(/Review & Submit/i));

    const confirmBtns = screen.getAllByRole('button', { name: /Submit Quiz/i });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.any(Object),
      10, // 10 out of 10 points
      10,
    );
    expect(screen.getByText(/Quiz Complete!/i)).toBeInTheDocument();
    expect(screen.getByText(/Grade: A\+ \(Outstanding\)/i)).toBeInTheDocument();
  });

  it('11. Clicking Review Answers displays Solutions & Explanation Review mode', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        isAlreadySubmitted={true}
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Review Answers & Solutions/i));
    expect(screen.getByText(/Solutions & Answer Review/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A Queue provides First-In, First-Out \(FIFO\) ordering\./i),
    ).toBeInTheDocument();
  });

  it('12. Hides instant score and answers when revealMarksMode is set to later', () => {
    render(
      <QuizContainer
        quizId="quiz-demo-1"
        title="Data Structures Assessment"
        subject="Computer Science"
        classroomName="Grade 9 CS"
        durationMinutes={15}
        questions={mockQuestions}
        isAlreadySubmitted={true}
        revealMarksMode="later"
        onClose={vi.fn()}
        onSubmitAnswers={vi.fn()}
      />,
    );

    expect(screen.getByText(/Attempt Submitted!/i)).toBeInTheDocument();
    expect(screen.getByText(/Scores & Answers Pending Teacher Release/i)).toBeInTheDocument();
    expect(screen.queryByText(/Review Answers & Solutions/i)).not.toBeInTheDocument();
  });

  it('13. CompletedQuizzesModal renders student completed quiz dashboard cleanly', () => {
    render(
      <AppProvider>
        <CompletedQuizzesModal isOpen={true} onClose={vi.fn()} onReviewQuiz={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/My Completed Quizzes & Evaluation Dashboard/i)).toBeInTheDocument();
  });
});

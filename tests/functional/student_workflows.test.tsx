import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { ClassroomView } from '../../src/components/student/ClassroomView';
import { AssignmentDetailModal } from '../../src/components/student/AssignmentDetailModal';
import { QuizRunnerModal } from '../../src/components/student/QuizRunnerModal';
import { AITutorModal } from '../../src/components/student/AITutorModal';

describe('Student Interactive Functional Workflows (tests/functional/student_workflows.test.tsx)', () => {
  it('allows student to view classroom stream and post announcements', async () => {
    const user = userEvent.setup();

    const ClassroomWrapper = () => {
      const { setSelectedClassroomId } = useApp();
      React.useEffect(() => {
        setSelectedClassroomId('cls-math-8a');
      }, [setSelectedClassroomId]);
      return <ClassroomView onOpenAssignmentModal={vi.fn()} onOpenQuizModal={vi.fn()} />;
    };

    render(
      <AppProvider>
        <ClassroomWrapper />
      </AppProvider>,
    );

    const postTextarea = await screen.findByPlaceholderText(
      /Announce something or ask a question/i,
    );
    await user.type(postTextarea, 'Here is my notes file for Science chapter 4');

    const postButton = screen.getByRole('button', { name: /Post/i });
    await user.click(postButton);

    expect(screen.getByText(/Here is my notes file for Science chapter 4/i)).toBeInTheDocument();
  });

  it('allows student to submit homework notes and direct submission', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AssignmentDetailModal assignmentId="asg-math-1" onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Teacher Instructions/i)).toBeInTheDocument();

    const notesTextarea = screen.getByPlaceholderText(
      /Type any notes or answers here if requested/i,
    );
    await user.type(notesTextarea, 'Solved Q1 to Q5 on my notebook.');

    const resubmitButton = screen.getByRole('button', { name: /Resubmit Homework/i });
    await user.click(resubmitButton);
  });

  it('allows student to take quiz, select answers, and view result score', async () => {
    render(
      <AppProvider>
        <QuizRunnerModal quizId="quiz-1" onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Algebraic Equations/i)).toBeInTheDocument();
  });

  it('allows student to send prompts to AI Tutor', async () => {
    const user = userEvent.setup();

    const TutorTestWrapper = () => {
      const { setIsAiTutorOpen } = useApp();
      React.useEffect(() => {
        setIsAiTutorOpen(true);
      }, [setIsAiTutorOpen]);
      return <AITutorModal />;
    };

    render(
      <AppProvider>
        <TutorTestWrapper />
      </AppProvider>,
    );

    const input = screen.getByPlaceholderText(/Ask Sikshya AI about/i);
    await user.type(input, 'Explain Snell law');

    const askButton = screen.getByRole('button', { name: /Ask/i });
    expect(askButton).not.toBeDisabled();
    await user.click(askButton);
  });
});

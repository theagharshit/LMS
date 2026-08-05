import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuizRunnerModal } from '../../../src/components/student/QuizRunnerModal';
import { AppProvider } from '../../../src/context/AppContext';

describe('QuizRunnerModal Component (src/components/student/QuizRunnerModal.tsx)', () => {
  it('renders online quiz modal', () => {
    render(
      <AppProvider>
        <QuizRunnerModal quizId="quiz-1" onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Algebraic Equations/i)).toBeInTheDocument();
  });
});

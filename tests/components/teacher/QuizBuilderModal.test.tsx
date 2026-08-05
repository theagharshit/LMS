import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuizBuilderModal } from '../../../src/components/teacher/QuizBuilderModal';
import { AppProvider } from '../../../src/context/AppContext';

describe('QuizBuilderModal Component (src/components/teacher/QuizBuilderModal.tsx)', () => {
  it('renders AI quiz generator builder modal', () => {
    render(
      <AppProvider>
        <QuizBuilderModal isOpen={true} onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Sikshya AI Quiz Creator for Teachers/i)).toBeInTheDocument();
  });
});

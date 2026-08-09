import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuizBuilderModal } from '../../../src/components/teacher/QuizBuilderModal';
import { AppProvider } from '../../../src/context/AppContext';

describe('QuizBuilderModal Component (src/components/teacher/QuizBuilderModal.tsx)', () => {
  it('renders Teacher Quiz Creator & Assessment Builder modal', () => {
    render(
      <AppProvider>
        <QuizBuilderModal isOpen={true} onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Sikshya AI Quiz Creator for Teachers/i)).toBeInTheDocument();
    expect(screen.getByText(/Score & Results Disclosure Setting:/i)).toBeInTheDocument();
    expect(screen.getByText(/Reveal Marks Immediately/i)).toBeInTheDocument();
    expect(screen.getByText(/Share Marks Later \(Teacher Review\)/i)).toBeInTheDocument();
  });

  it('allows teacher to add new questions dynamically', () => {
    render(
      <AppProvider>
        <QuizBuilderModal isOpen={true} onClose={vi.fn()} />
      </AppProvider>,
    );

    const addBtn = screen.getByText(/Add Another Question/i);
    fireEvent.click(addBtn);

    expect(screen.getByText(/Manage Quiz Questions \(2\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Question #2/i)).toBeInTheDocument();
  });
});

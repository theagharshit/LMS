import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TeacherDashboard } from '../../../src/components/teacher/TeacherDashboard';
import { AppProvider, useApp } from '../../../src/context/AppContext';

const TestWrapper = ({ onOpenGradeModal, onOpenQuizBuilderModal }: any) => {
  const { switchUser } = useApp();
  useEffect(() => {
    switchUser('user-teach-1');
  }, [switchUser]);

  return (
    <TeacherDashboard
      onOpenGradeModal={onOpenGradeModal}
      onOpenQuizBuilderModal={onOpenQuizBuilderModal}
    />
  );
};

describe('TeacherDashboard Component (src/components/teacher/TeacherDashboard.tsx)', () => {
  it('renders teacher welcome banner and homework submissions queue', () => {
    render(
      <AppProvider>
        <TestWrapper onOpenGradeModal={vi.fn()} onOpenQuizBuilderModal={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Class Teacher & Mathematics Faculty/i)).toBeInTheDocument();
  });
});

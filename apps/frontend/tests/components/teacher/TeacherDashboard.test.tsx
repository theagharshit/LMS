import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TeacherDashboard } from '../../../src/components/teacher/TeacherDashboard';
import { AppProvider, useApp } from '../../../src/context/AppContext';

const TestWrapper = ({ onOpenGradeModal, onOpenQuizBuilderModal }: any) => {
  const { allUsers, establishSession } = useApp();
  useEffect(() => {
    const teacher = allUsers.find((user) => user.id === 'user-teach-1');
    if (teacher) establishSession(teacher, 'database-test-token-user-teach-1');
  }, [allUsers, establishSession]);

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

    expect(screen.getByText(/Faculty • Mathematics, Computer Science/i)).toBeInTheDocument();
  });
});

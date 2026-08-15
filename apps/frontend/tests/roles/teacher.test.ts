import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { TeacherDashboard } from '../../src/components/teacher/TeacherDashboard';

const TeacherTestWrapper = () => {
  const { allUsers, establishSession } = useApp();
  useEffect(() => {
    const teacher = allUsers.find((user) => user.id === 'user-teach-1');
    if (teacher) establishSession(teacher, 'database-test-token-user-teach-1');
  }, [allUsers, establishSession]);

  return React.createElement(TeacherDashboard, {
    onOpenGradeModal: vi.fn(),
    onOpenQuizBuilderModal: vi.fn(),
  });
};

describe('Role 2: Teacher Permissions & Workflows (tests/roles/teacher.test.ts)', () => {
  it('allows teacher to review homework queue and manage weekly timetable', () => {
    render(React.createElement(AppProvider, null, React.createElement(TeacherTestWrapper)));

    expect(screen.getByText(/Faculty • Mathematics, Computer Science/i)).toBeInTheDocument();
    expect(screen.getByText(/Homework Submissions Queue/i)).toBeInTheDocument();
  });
});

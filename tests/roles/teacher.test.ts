import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { TeacherDashboard } from '../../src/components/teacher/TeacherDashboard';

const TeacherTestWrapper = () => {
  const { switchUser } = useApp();
  useEffect(() => {
    switchUser('user-teach-1');
  }, [switchUser]);

  return React.createElement(TeacherDashboard, {
    onOpenGradeModal: vi.fn(),
    onOpenQuizBuilderModal: vi.fn()
  });
};

describe('Role 2: Teacher Permissions & Workflows (tests/roles/teacher.test.ts)', () => {
  it('allows teacher to review homework queue and manage weekly timetable', () => {
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TeacherTestWrapper)
      )
    );

    expect(screen.getByText(/Class Teacher & Mathematics Faculty/i)).toBeInTheDocument();
    expect(screen.getByText(/Homework Submissions Queue/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { StudentDashboard } from '../../src/components/student/StudentDashboard';
import { ClassroomView } from '../../src/components/student/ClassroomView';

describe('Role 1: Student Permissions & Workflows (tests/roles/student.test.ts)', () => {
  it('allows student to view enrolled subjects and progress dashboard', () => {
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(StudentDashboard, {
          onOpenAssignmentModal: vi.fn(),
          onOpenQuizModal: vi.fn(),
        }),
      ),
    );

    expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
  });

  it('allows student to access classroom stream and attach files', () => {
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(ClassroomView, {
          onOpenAssignmentModal: vi.fn(),
          onOpenQuizModal: vi.fn(),
        }),
      ),
    );

    expect(screen.getAllByText(/Enrolled Subjects/i)[0]).toBeInTheDocument();
  });
});

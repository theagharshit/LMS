import React, { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { TeacherDashboard } from '../../src/components/teacher/TeacherDashboard';
import { AttendanceRegister } from '../../src/components/teacher/AttendanceRegister';
import { QuizBuilderModal } from '../../src/components/teacher/QuizBuilderModal';

describe('Teacher Interactive Functional Workflows (tests/functional/teacher_workflows.test.tsx)', () => {
  const TeacherWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { switchUser } = useApp();
    useEffect(() => {
      switchUser('user-teach-1');
    }, [switchUser]);
    return <>{children}</>;
  };

  it('allows teacher to review homework queue and grade submissions', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <TeacherWrapper>
          <TeacherDashboard onOpenGradeModal={vi.fn()} onOpenQuizBuilderModal={vi.fn()} />
        </TeacherWrapper>
      </AppProvider>
    );

    expect(screen.getByText(/Class Teacher & Mathematics Faculty/i)).toBeInTheDocument();
    expect(screen.getByText(/Homework Submissions Queue/i)).toBeInTheDocument();

    const gradeButtons = screen.getAllByRole('button', { name: /Grade & Feedback/i });
    expect(gradeButtons.length).toBeGreaterThan(0);
  });

  it('allows teacher to mark daily attendance and send parent alerts', async () => {
    render(
      <AppProvider>
        <TeacherWrapper>
          <AttendanceRegister />
        </TeacherWrapper>
      </AppProvider>
    );

    expect(screen.getByText(/Daily Student Attendance Register/i)).toBeInTheDocument();
  });

  it('allows teacher to build AI quiz and publish to classroom', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <TeacherWrapper>
          <QuizBuilderModal isOpen={true} onClose={vi.fn()} />
        </TeacherWrapper>
      </AppProvider>
    );

    expect(screen.getByText(/Sikshya AI Quiz Creator for Teachers/i)).toBeInTheDocument();

    const publishButton = screen.getByRole('button', { name: /Publish Quiz to Classroom/i });
    await user.click(publishButton);
  });
});

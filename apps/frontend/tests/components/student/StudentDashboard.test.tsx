import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentDashboard } from '../../../src/components/student/StudentDashboard';
import { AppProvider } from '../../../src/context/AppContext';

describe('StudentDashboard Component (src/components/student/StudentDashboard.tsx)', () => {
  it('renders student welcome banner and widgets', () => {
    render(
      <AppProvider>
        <StudentDashboard onOpenAssignmentModal={vi.fn()} onOpenQuizModal={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClassroomView } from '../../../src/components/student/ClassroomView';
import { AppProvider } from '../../../src/context/AppContext';

describe('ClassroomView Component (src/components/student/ClassroomView.tsx)', () => {
  it('renders classroom subject header and stream tab', () => {
    render(
      <AppProvider>
        <ClassroomView
          onOpenAssignmentModal={vi.fn()}
          onOpenQuizModal={vi.fn()}
        />
      </AppProvider>
    );

    expect(screen.getAllByText(/Enrolled Subjects/i)[0]).toBeInTheDocument();
  });
});

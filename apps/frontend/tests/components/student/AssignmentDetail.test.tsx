import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssignmentDetailModal } from '../../../src/components/student/AssignmentDetailModal';
import { AppProvider } from '../../../src/context/AppContext';

describe('AssignmentDetailModal Component (src/components/student/AssignmentDetailModal.tsx)', () => {
  it('renders assignment detail modal', () => {
    render(
      <AppProvider>
        <AssignmentDetailModal assignmentId="asg-math-1" onClose={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getByText(/Teacher Instructions/i)).toBeInTheDocument();
  });
});

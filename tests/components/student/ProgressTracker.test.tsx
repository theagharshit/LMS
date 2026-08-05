import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressTrackerView } from '../../../src/components/student/ProgressTrackerView';
import { AppProvider } from '../../../src/context/AppContext';

describe('ProgressTrackerView Component (src/components/student/ProgressTrackerView.tsx)', () => {
  it('renders student progress performance headers', () => {
    render(
      <AppProvider>
        <ProgressTrackerView />
      </AppProvider>
    );

    expect(screen.getByText(/Academic Progress/i)).toBeInTheDocument();
  });
});

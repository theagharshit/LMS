import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StudentProfileView } from '../../../src/components/student/StudentProfileView';
import { AppProvider } from '../../../src/context/AppContext';

describe('StudentProfileView Component (src/components/student/StudentProfileView.tsx)', () => {
  it('renders student profile view and earned badges', () => {
    render(
      <AppProvider>
        <StudentProfileView />
      </AppProvider>
    );

    expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
  });
});

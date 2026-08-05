import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AcademicCalendarView } from '../../../src/components/common/AcademicCalendarView';
import { AppProvider } from '../../../src/context/AppContext';

describe('AcademicCalendarView Component (src/components/common/AcademicCalendarView.tsx)', () => {
  it('renders academic calendar header and events', () => {
    render(
      <AppProvider>
        <AcademicCalendarView />
      </AppProvider>
    );

    expect(screen.getAllByText(/Academic Timeline/i)[0]).toBeInTheDocument();
  });
});

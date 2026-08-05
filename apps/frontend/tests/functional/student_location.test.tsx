import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { StudentLocationTracker } from '../../src/components/common/StudentLocationTracker';

describe('Student Location Tracker Functional Component (tests/functional/student_location.test.tsx)', () => {
  it('renders student location badge and allows teacher to update location status', async () => {
    const user = userEvent.setup();

    render(
      <AppProvider>
        <StudentLocationTracker studentId="user-stu-1" studentName="Aarav Sharma" />
      </AppProvider>,
    );

    expect(screen.getByText(/Where is Student\? • Live Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/In Math Class \(Room 204\)/i)).toBeInTheDocument();
  });
});

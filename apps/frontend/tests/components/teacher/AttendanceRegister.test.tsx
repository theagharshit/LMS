import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AttendanceRegister } from '../../../src/components/teacher/AttendanceRegister';
import { AppProvider } from '../../../src/context/AppContext';

describe('AttendanceRegister Component (src/components/teacher/AttendanceRegister.tsx)', () => {
  it('renders daily attendance register table', () => {
    render(
      <AppProvider>
        <AttendanceRegister />
      </AppProvider>,
    );

    expect(screen.getByText(/Daily Student Attendance Register/i)).toBeInTheDocument();
  });
});

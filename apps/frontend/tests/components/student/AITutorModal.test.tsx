import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AITutorModal } from '../../../src/components/student/AITutorModal';
import { AppProvider, useApp } from '../../../src/context/AppContext';

const TestWrapper = () => {
  const { setIsAiTutorOpen } = useApp();
  useEffect(() => {
    setIsAiTutorOpen(true);
  }, [setIsAiTutorOpen]);

  return <AITutorModal />;
};

describe('AITutorModal Component (src/components/student/AITutorModal.tsx)', () => {
  it('renders AI tutor modal header and prompt input', () => {
    render(
      <AppProvider>
        <TestWrapper />
      </AppProvider>,
    );

    expect(screen.getAllByText(/Sikshya AI/i)[0]).toBeInTheDocument();
  });
});

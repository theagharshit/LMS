import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AIParentSummaryModal } from '../../../src/components/parent/AIParentSummaryModal';
import { AppProvider, useApp } from '../../../src/context/AppContext';

const TestWrapper = () => {
  const { setIsAiParentSummaryOpen } = useApp();
  useEffect(() => {
    setIsAiParentSummaryOpen(true);
  }, [setIsAiParentSummaryOpen]);

  return <AIParentSummaryModal />;
};

describe('AIParentSummaryModal Component (src/components/parent/AIParentSummaryModal.tsx)', () => {
  it('renders AI parent summary modal', () => {
    render(
      <AppProvider>
        <TestWrapper />
      </AppProvider>,
    );

    expect(screen.getByText(/Parent Weekly Summary/i)).toBeInTheDocument();
  });
});

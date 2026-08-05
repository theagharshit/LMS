import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParentDashboard } from '../../../src/components/parent/ParentDashboard';
import { AppProvider, useApp } from '../../../src/context/AppContext';

const TestWrapper = ({ onOpenParentSummaryModal, onOpenParentalControls }: any) => {
  const { switchUser } = useApp();
  useEffect(() => {
    switchUser('user-parent-1');
  }, [switchUser]);

  return <ParentDashboard onOpenParentalControls={onOpenParentalControls} />;
};

describe('ParentDashboard Component (src/components/parent/ParentDashboard.tsx)', () => {
  it('renders parent overview dashboard', () => {
    render(
      <AppProvider>
        <TestWrapper onOpenParentalControls={vi.fn()} />
      </AppProvider>,
    );

    expect(screen.getAllByText(/Parent Portal/i)[0]).toBeInTheDocument();
  });
});

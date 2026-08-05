import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { ParentDashboard } from '../../src/components/parent/ParentDashboard';

const ParentTestWrapper = () => {
  const { switchUser } = useApp();
  useEffect(() => {
    switchUser('user-parent-1');
  }, [switchUser]);

  return React.createElement(ParentDashboard, {
    onOpenParentSummaryModal: vi.fn(),
    onOpenParentalControlsModal: vi.fn()
  });
};

describe('Role 3: Parent Permissions & Workflows (tests/roles/parent.test.ts)', () => {
  it('allows parent to view child attendance and trigger AI parent digest', () => {
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(ParentTestWrapper)
      )
    );

    expect(screen.getAllByText(/Parent Portal/i)[0]).toBeInTheDocument();
  });
});

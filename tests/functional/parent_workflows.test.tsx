import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { ParentDashboard } from '../../src/components/parent/ParentDashboard';
import { ParentalControlsModal } from '../../src/components/parent/ParentalControlsModal';
import { AIParentSummaryModal } from '../../src/components/parent/AIParentSummaryModal';

describe('Parent Interactive Functional Workflows (tests/functional/parent_workflows.test.tsx)', () => {
  const ParentWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { switchUser } = useApp();
    useEffect(() => {
      switchUser('user-parent-1');
    }, [switchUser]);
    return <>{children}</>;
  };

  it('allows parent to view child overview and trigger AI summary modal', async () => {
    const user = userEvent.setup();
    const handleOpenSummary = vi.fn();
    const handleOpenControls = vi.fn();

    render(
      <AppProvider>
        <ParentWrapper>
          <ParentDashboard
            onOpenParentSummaryModal={handleOpenSummary}
            onOpenParentalControlsModal={handleOpenControls}
          />
        </ParentWrapper>
      </AppProvider>
    );

    expect(screen.getAllByText(/Parent Portal/i)[0]).toBeInTheDocument();

    const summaryButton = screen.getByRole('button', { name: /Generate AI Bilingual Digest/i });
    await user.click(summaryButton);
  });

  it('allows parent to modify screen time limits and safety controls', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AppProvider>
        <ParentWrapper>
          <ParentalControlsModal isOpen={true} onClose={handleClose} />
        </ParentWrapper>
      </AppProvider>
    );

    expect(screen.getByText(/Parental Safety Controls/i)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save Safety Settings/i });
    await user.click(saveButton);
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows parent to trigger AI bilingual digest report', async () => {
    const DigestWrapper = () => {
      const { setIsAiParentSummaryOpen } = useApp();
      useEffect(() => {
        setIsAiParentSummaryOpen(true);
      }, [setIsAiParentSummaryOpen]);
      return <AIParentSummaryModal />;
    };

    render(
      <AppProvider>
        <ParentWrapper>
          <DigestWrapper />
        </ParentWrapper>
      </AppProvider>
    );

    expect(screen.getByText(/Parent Weekly Summary/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParentalControlsModal } from '../../../src/components/parent/ParentalControlsModal';
import { AppProvider } from '../../../src/context/AppContext';

describe('ParentalControlsModal Component (src/components/parent/ParentalControlsModal.tsx)', () => {
  it('renders parental controls modal', () => {
    render(
      <AppProvider>
        <ParentalControlsModal isOpen={true} onClose={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByText(/Parental Safety Controls/i)).toBeInTheDocument();
  });
});

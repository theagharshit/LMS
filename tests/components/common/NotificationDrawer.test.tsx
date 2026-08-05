import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationDrawer } from '../../../src/components/common/NotificationDrawer';
import { AppProvider } from '../../../src/context/AppContext';

describe('NotificationDrawer Component (src/components/common/NotificationDrawer.tsx)', () => {
  it('renders notifications drawer when open', () => {
    render(
      <AppProvider>
        <NotificationDrawer isOpen={true} onClose={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });
});

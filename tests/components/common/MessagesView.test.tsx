import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessagesView } from '../../../src/components/common/MessagesView';
import { AppProvider } from '../../../src/context/AppContext';

describe('MessagesView Component (src/components/common/MessagesView.tsx)', () => {
  it('renders messaging sidebar and active channel', () => {
    render(
      <AppProvider>
        <MessagesView />
      </AppProvider>
    );

    expect(screen.getByText(/School Messages & Channels/i)).toBeInTheDocument();
  });
});

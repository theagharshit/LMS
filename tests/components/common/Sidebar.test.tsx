import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sidebar } from '../../../src/components/common/Sidebar';
import { AppProvider } from '../../../src/context/AppContext';

describe('Sidebar Component (src/components/common/Sidebar.tsx)', () => {
  it('renders navigation links', () => {
    render(
      <AppProvider>
        <Sidebar />
      </AppProvider>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});

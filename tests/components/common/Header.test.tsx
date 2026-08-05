import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../../../src/components/common/Header';
import { AppProvider } from '../../../src/context/AppContext';

describe('Header Component (src/components/common/Header.tsx)', () => {
  it('renders brand title and profile avatar switcher', () => {
    render(
      <AppProvider>
        <Header onToggleNotifications={vi.fn()} />
      </AppProvider>
    );

    expect(screen.getAllByText(/Sikshya/i)[0]).toBeInTheDocument();
  });
});

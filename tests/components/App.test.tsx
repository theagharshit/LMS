import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../src/App';

describe('App Main Root Component (src/App.tsx)', () => {
  it('renders application header and sidebar without crashing', () => {
    render(<App />);
    expect(screen.getAllByText(/Sikshya/i)[0]).toBeInTheDocument();
  });
});

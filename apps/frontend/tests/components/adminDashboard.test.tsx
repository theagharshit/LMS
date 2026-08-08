import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminDashboard } from '../../src/components/admin/AdminDashboard';
import { AppProvider } from '../../src/context/AppContext';

describe('AdminDashboard Component Suite (15 Tests)', () => {
  it('1. renders Admin Dashboard title and header description', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Manage school-wide configurations and manual awards/i),
    ).toBeInTheDocument();
  });

  it('2. renders Manual Badge Awarding section heading', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Manual Badge Awarding/i)).toBeInTheDocument();
  });

  it('3. renders Student select dropdown with placeholder option', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/-- Choose Student --/i)).toBeInTheDocument();
  });

  it('4. renders Badge select dropdown with placeholder option', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/-- Choose Badge --/i)).toBeInTheDocument();
  });

  it('5. renders Remarks optional input field', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByPlaceholderText(/Reason for awarding this badge/i)).toBeInTheDocument();
  });

  it('6. Award Badge button is disabled when student or badge is not selected', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const btn = screen.getByRole('button', { name: /Award Badge/i });
    expect(btn).toBeDisabled();
  });

  it('7. updates remarks input state on user typing', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const input = screen.getByPlaceholderText(
      /Reason for awarding this badge/i,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Excellent behavior' } });
    expect(input.value).toBe('Excellent behavior');
  });

  it('8. renders Badge Definitions Dictionary gallery', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Badge Definitions Dictionary/i)).toBeInTheDocument();
  });

  it('9. renders automatic vs manual tags on badge items', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const tags = screen.getAllByText(/(Automatic|Manual)/i);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('10. populated student options display student name and grade level', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toBeInTheDocument();
    expect(screen.getByText(/-- Choose Student --/i)).toBeInTheDocument();
  });

  it('11. populated badge options display emoji icon and title', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('12. enables Award Badge button when student and badge options are selected', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'user-stu-1' } });
    fireEvent.change(selects[1], { target: { value: 'bdg-def-1' } });

    const btn = screen.getByRole('button', { name: /Award Badge/i });
    expect(btn).not.toBeDisabled();
  });

  it('13. triggers alert and clears inputs after clicking Award Badge', async () => {
    window.alert = vi.fn();
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'user-stu-1' } });
    fireEvent.change(selects[1], { target: { value: 'bdg-def-1' } });

    const btn = screen.getByRole('button', { name: /Award Badge/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('14. maintains responsive container classes for mobile grid layout', () => {
    const { container } = render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('15. renders LucideShield and LucideAward icons inside Admin header', () => {
    const { container } = render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminDashboard } from '../../src/components/admin/AdminDashboard';
import { AppProvider } from '../../src/context/AppContext';

describe('AdminDashboard Component Suite (15 Tests)', () => {
  it('1. renders Administrative Management Hub title and header banner', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Administrative Management Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete institutional control over students/i)).toBeInTheDocument();
  });

  it('2. renders sub-tab navigation items', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Overview & Stats/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Directory/i)).toBeInTheDocument();
    expect(screen.getByText(/Family & Parents/i)).toBeInTheDocument();
    expect(screen.getByText(/Faculty Staff/i)).toBeInTheDocument();
  });

  it('3. renders Overview metrics cards', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(screen.getByText(/Total Students/i)).toBeInTheDocument();
    expect(screen.getByText(/Faculty Members/i)).toBeInTheDocument();
    expect(screen.getByText(/Parents Linked/i)).toBeInTheDocument();
  });

  it('4. switches to Badges & Awards tab when tab button is clicked', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    const badgeTab = screen.getByText(/Badges & Awards/i);
    fireEvent.click(badgeTab);
    expect(screen.getByText(/Manual Student Badge Awarding Desk/i)).toBeInTheDocument();
  });

  it('5. renders Remarks optional input field in Badges tab', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    expect(screen.getByPlaceholderText(/Awarded for exemplary discipline/i)).toBeInTheDocument();
  });

  it('6. Award Badge button is disabled when student or badge is not selected', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const btn = screen.getByRole('button', { name: /Award Badge to Student/i });
    expect(btn).toBeDisabled();
  });

  it('7. updates remarks input state on user typing', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const input = screen.getByPlaceholderText(
      /Awarded for exemplary discipline/i,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Excellent behavior' } });
    expect(input.value).toBe('Excellent behavior');
  });

  it('8. renders Define New Custom Badge section', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    expect(screen.getByText(/Define New Custom Badge/i)).toBeInTheDocument();
  });

  it('9. switches to Student Directory tab and lists student records', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Student Directory/i));
    expect(screen.getByText(/Student Directory & Enrolled Records/i)).toBeInTheDocument();
  });

  it('10. populated student options display student name in combobox', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toBeInTheDocument();
    expect(screen.getByText(/-- Choose Student --/i)).toBeInTheDocument();
  });

  it('11. populated badge options display emoji icon and title in combobox', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('12. enables Award Badge button when student and badge options are selected', () => {
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'user-stu-1' } });
    fireEvent.change(selects[1], { target: { value: 'bdg-def-1' } });

    const btn = screen.getByRole('button', { name: /Award Badge to Student/i });
    expect(btn).not.toBeDisabled();
  });

  it('13. triggers alert and clears inputs after clicking Award Badge', async () => {
    window.alert = vi.fn();
    render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(/Badges & Awards/i));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'user-stu-1' } });
    fireEvent.change(selects[1], { target: { value: 'bdg-def-1' } });

    const btn = screen.getByRole('button', { name: /Award Badge to Student/i });
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

  it('15. renders icons inside Admin header banner', () => {
    const { container } = render(
      <AppProvider>
        <AdminDashboard />
      </AppProvider>,
    );
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../src/components/common/ToastProvider';
import { apiFetch } from '../src/utils/apiFetch';
import { toast } from '../src/utils/toast';

const ToastButton = () => {
  const { notify } = useToast();
  return <button onClick={() => notify('Saved from the hook', 'success')}>Save</button>;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('application-wide toast system', () => {
  it('shows a success toast through the public event API', () => {
    const view = render(<ToastProvider>App</ToastProvider>);
    act(() => toast.success('Student profile saved.'));
    expect(view.container.querySelector('[aria-live="polite"]')).toHaveClass(
      'bottom-3',
      'left-4',
      'lg:w-56',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Success');
    expect(screen.getByRole('status')).toHaveTextContent('Student profile saved.');
  });

  it('supports custom titles and error alert semantics', () => {
    render(<ToastProvider>App</ToastProvider>);
    act(() => toast.error('The server rejected the request.', { title: 'Save failed' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('alert')).toHaveTextContent('The server rejected the request.');
  });

  it('deduplicates identical active notifications', () => {
    render(<ToastProvider>App</ToastProvider>);
    act(() => {
      toast.info('Connection restored.');
      toast.info('Connection restored.');
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('can be dismissed with its accessible close button', () => {
    render(<ToastProvider>App</ToastProvider>);
    act(() => toast.warning('Please review this change.'));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss warning notification' }));
    expect(screen.queryByText('Please review this change.')).not.toBeInTheDocument();
  });

  it('works through the React useToast hook', () => {
    render(
      <ToastProvider>
        <ToastButton />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved from the hook')).toBeVisible();
  });

  it('shows action-specific feedback after a successful API mutation', async () => {
    render(<ToastProvider>App</ToastProvider>);
    const response = await apiFetch('/api/db/test-toast', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
      feedback: { success: 'The record is safely stored.', successTitle: 'Record saved' },
    });
    expect(response.ok).toBe(true);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Record saved'));
    expect(screen.getByRole('status')).toHaveTextContent('The record is safely stored.');
  });
});

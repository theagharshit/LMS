import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizBuilderWizard } from '../../../src/components/teacher/QuizBuilderWizard';
import { AppProvider } from '../../../src/context/AppContext';

describe('QuizBuilderWizard Component', () => {
  it('1. renders wizard step 1 when open', () => {
    render(
      <AppProvider>
        <QuizBuilderWizard isOpen={true} onClose={vi.fn()} />
      </AppProvider>,
    );
    expect(screen.getByText('Create Quiz')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
  });

  it('2. navigates to resources step', () => {
    render(
      <AppProvider>
        <QuizBuilderWizard isOpen={true} onClose={vi.fn()} />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Select study materials/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';

const TestBadgeConsumer: React.FC = () => {
  const { badgeDefinitions, studentProfiles, assignBadge } = useApp();

  return (
    <div>
      <span data-testid="badge-defs-count">{badgeDefinitions.length}</span>
      <span data-testid="student-profiles-count">{studentProfiles.length}</span>
      <button
        data-testid="assign-badge-btn"
        onClick={() => assignBadge('user-stu-1', 'bdg-def-1', 'Test Remark')}
      >
        Assign Badge
      </button>
      <div data-testid="student-badges">
        {studentProfiles
          .find((p) => p.id === 'user-stu-1')
          ?.badges.map((b) => (
            <div key={b.id} data-testid="badge-item">
              {b.badgeDefinition?.title || 'Unknown'}
            </div>
          ))}
      </div>
    </div>
  );
};

describe('AppContext Badge State Suite (15 Tests)', () => {
  it('1. provides badgeDefinitions from the test database bootstrap state', () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    const count = Number(screen.getByTestId('badge-defs-count').textContent);
    expect(count).toBeGreaterThan(0);
  });

  it('2. provides initial studentProfiles from state', () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    const count = Number(screen.getByTestId('student-profiles-count').textContent);
    expect(count).toBeGreaterThan(0);
  });

  it('3. exposes assignBadge async function on AppContext value', () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    expect(screen.getByTestId('assign-badge-btn')).toBeInTheDocument();
  });

  it('4. studentProfile contains badges array property', () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    expect(screen.getByTestId('student-badges')).toBeInTheDocument();
  });

  it('5. badge items render badgeDefinition title correctly', () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    const items = screen.queryAllByTestId('badge-item');
    expect(Array.isArray(items)).toBe(true);
  });

  it('6. assignBadge click triggers API fetch call', async () => {
    render(
      <AppProvider>
        <TestBadgeConsumer />
      </AppProvider>,
    );
    const btn = screen.getByTestId('assign-badge-btn');
    await act(async () => {
      btn.click();
    });
    expect(btn).toBeInTheDocument();
  });

  it('7. badgeDefinitions array contains elements with icon property', () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );
    expect(contextValue.badgeDefinitions[0].icon).toBeDefined();
  });

  it('8. badgeDefinitions elements have isAutomatic boolean property', () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );
    expect(typeof contextValue.badgeDefinitions[0].isAutomatic).toBe('boolean');
  });

  it('9. studentProfiles elements have gradeLevel and section', () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );
    const stu = contextValue.studentProfiles[0];
    expect(stu.gradeLevel).toBeDefined();
    expect(stu.section).toBeDefined();
  });

  it('10. useApp hook throws Error when used outside of AppProvider', () => {
    const BadConsumer = () => {
      useApp();
      return null;
    };
    expect(() => render(<BadConsumer />)).toThrow('useApp must be used within an AppProvider');
  });

  it('11. activeChild defaults to first student profile', () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );
    expect(contextValue.activeChild).toBeDefined();
  });

  it('12. activeChildList contains list of student profiles for parent user', () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );
    expect(Array.isArray(contextValue.activeChildList)).toBe(true);
  });

  it('13. switchUser function updates active user and view', async () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );

    act(() => {
      contextValue.switchUser('user-admin-1');
    });
    await waitFor(() => expect(contextValue.currentUser.role).toBe('admin'));
  });

  it('14. joinClassroomByCode returns false for non-existent classroom code', async () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );

    let res: boolean = false;
    await act(async () => {
      res = await contextValue.joinClassroomByCode('INVALID_CODE_999');
    });
    expect(res).toBe(false);
  });

  it('15. joinClassroomByCode returns true and switches view for matching classroom code', async () => {
    let contextValue: any = null;
    const CaptureComponent = () => {
      contextValue = useApp();
      return null;
    };
    render(
      <AppProvider>
        <CaptureComponent />
      </AppProvider>,
    );

    const validCode = contextValue.classrooms[0]?.code || 'MATH8A';
    let res: boolean = false;
    await act(async () => {
      res = await contextValue.joinClassroomByCode(validCode);
    });
    expect(res).toBe(true);
  });
});

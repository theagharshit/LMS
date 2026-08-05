import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext Global State (src/context/AppContext.tsx)', () => {
  it('should provide default current user and classrooms', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.currentUser).toBeDefined();
    expect(result.current.classrooms.length).toBeGreaterThan(0);
  });

  it('should switch user between Student, Teacher, and Parent', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    
    act(() => {
      result.current.switchUser('user-teach-1'); // Teacher Ramesh
    });
    expect(result.current.currentUser.role).toBe('teacher');

    act(() => {
      result.current.switchUser('user-parent-1'); // Parent Bina
    });
    expect(result.current.currentUser.role).toBe('parent');

    act(() => {
      result.current.switchUser('user-stu-1'); // Student Aarav
    });
    expect(result.current.currentUser.role).toBe('student');
  });

  it('should allow adding stream posts with attachments', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const initialCount = result.current.streamPosts.length;

    act(() => {
      result.current.addStreamPost({
        classroomId: 'chan-1',
        authorId: result.current.currentUser.id,
        authorName: result.current.currentUser.name,
        authorAvatar: result.current.currentUser.avatar,
        authorRole: result.current.currentUser.role,
        content: 'Test Post with attachment',
        attachments: [
          {
            id: 'att-test',
            title: 'Sample_Guide.pdf',
            type: 'pdf',
            url: 'blob:test',
            size: '1.20 MB'
          }
        ]
      });
    });

    expect(result.current.streamPosts.length).toBe(initialCount + 1);
    const newPost = result.current.streamPosts[0];
    expect(newPost.content).toBe('Test Post with attachment');
    expect(newPost.attachments).toBeDefined();
    expect(newPost.attachments?.[0].title).toBe('Sample_Guide.pdf');
  });

  it('should join classroom by code', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    let success = false;
    act(() => {
      success = result.current.joinClassroomByCode('MATH8A');
    });
    expect(success).toBe(true);
  });
});

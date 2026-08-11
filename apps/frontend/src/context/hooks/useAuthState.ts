import { useState, useEffect, useCallback } from 'react';
import { User, StudentProfile, MOCK_USERS, MOCK_STUDENTS } from '@lms/shared';
import { apiFetch } from '@utils/apiFetch';

export const useAuthState = () => {
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [activeChildId, setActiveChildId] = useState<string>('user-stu-1');
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const fetchJwtTokenForUser = useCallback(async (user: User) => {
    try {
      await apiFetch('/api/auth/csrf');
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setJwtToken(data.token);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('lms_jwt_token', data.token);
          }
        }
      }
    } catch (err) {
      console.warn('[useAuthState] Failed to fetch JWT token for user:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchJwtTokenForUser(currentUser);
    }
  }, [currentUser, fetchJwtTokenForUser]);

  const activeChildList = studentProfiles.filter((s) => currentUser.childrenIds?.includes(s.id));
  const activeChild = studentProfiles.find((s) => s.id === activeChildId) || studentProfiles[0];

  useEffect(() => {
    if (typeof sessionStorage === 'undefined' || currentUser.role !== 'parent') return;
    sessionStorage.setItem(
      `sikshya_children_${currentUser.id}`,
      JSON.stringify(
        activeChildList.map(({ id, name, avatar, gradeLevel, section }) => ({
          id,
          name,
          avatar,
          gradeLevel,
          section,
        })),
      ),
    );
  }, [currentUser.id, currentUser.role, activeChildList]);

  return {
    allUsers,
    setAllUsers,
    currentUser,
    setCurrentUser,
    studentProfiles,
    setStudentProfiles,
    activeChildId,
    setActiveChildId,
    activeChildList,
    activeChild,
    jwtToken,
  };
};
